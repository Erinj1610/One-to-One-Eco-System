using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.Text.Json;
using System.Text.Json.Serialization;
using ACadSharp;
using ACadSharp.Entities;
using ACadSharp.IO;
using CSMath;

namespace OneToOne.CadParser
{
    public class Program
    {
        public static int Main(string[] args)
        {
            if (args.Length < 2)
            {
                Console.WriteLine(JsonSerializer.Serialize(new
                {
                    success = false,
                    error = "Usage: CadParser <inspect|parse> <file.dwg> [--lighting-layer <name>] [--boundary-layer <name>] [--default-floor <name>]"
                }));
                return 1;
            }

            string command = args[0].ToLowerInvariant();
            string filePath = args[1];

            if (!File.Exists(filePath))
            {
                Console.WriteLine(JsonSerializer.Serialize(new
                {
                    success = false,
                    error = $"DWG file does not exist: {filePath}"
                }));
                return 1;
            }

            string? lightingLayer = null;
            string? boundaryLayer = null;
            string defaultFloor = "Ground Floor";

            for (int i = 2; i < args.Length; i++)
            {
                if (args[i] == "--lighting-layer" && i + 1 < args.Length)
                {
                    lightingLayer = args[++i];
                }
                else if (args[i] == "--boundary-layer" && i + 1 < args.Length)
                {
                    boundaryLayer = args[++i];
                }
                else if (args[i] == "--default-floor" && i + 1 < args.Length)
                {
                    defaultFloor = args[++i];
                }
            }

            try
            {
                using var stream = File.OpenRead(filePath);
                using var reader = new DwgReader(stream);
                var doc = reader.Read();

                if (command == "inspect")
                {
                    return InspectDrawing(doc);
                }
                else if (command == "parse")
                {
                    return ParseDrawing(doc, lightingLayer, boundaryLayer, defaultFloor);
                }
                else
                {
                    Console.WriteLine(JsonSerializer.Serialize(new
                    {
                        success = false,
                        error = $"Unknown command: {command}. Expected 'inspect' or 'parse'."
                    }));
                    return 1;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine(JsonSerializer.Serialize(new
                {
                    success = false,
                    error = ex.Message,
                    stackTrace = ex.StackTrace
                }));
                return 1;
            }
        }

        private static int InspectDrawing(CadDocument doc)
        {
            var layerGroups = doc.Entities
                .GroupBy(e => e.Layer?.Name ?? "0")
                .Select(g =>
                {
                    int inserts = g.OfType<Insert>().Count();
                    var polys = g.OfType<LwPolyline>().ToList();
                    int closedPolys = polys.Count(p => p.IsClosed && p.Vertices.Count >= 3);
                    int texts = g.Count(e => e is MText || e is TextEntity);
                    int lines = g.OfType<Line>().Count();

                    string name = g.Key;
                    string nameUpper = name.ToUpperInvariant();

                    bool isLighting = inserts > 0 && (
                        nameUpper.Contains("LIGHT") ||
                        nameUpper.Contains("LUM") ||
                        nameUpper.Contains("FIXT") ||
                        nameUpper.Contains("1 TO 1") ||
                        nameUpper.Contains("1TO1") ||
                        nameUpper.Contains("E-") ||
                        nameUpper.Contains("LAMP")
                    );

                    bool isBoundary = closedPolys > 0 && (
                        nameUpper.Contains("COUNT") ||
                        nameUpper.Contains("AREA") ||
                        nameUpper.Contains("ROOM") ||
                        nameUpper.Contains("ZONE") ||
                        nameUpper.Contains("LAYOUT") ||
                        nameUpper.Contains("WALL")
                    );

                    return new LayerInfo
                    {
                        Name = name,
                        Inserts = inserts,
                        ClosedPolylines = closedPolys,
                        TotalPolylines = polys.Count,
                        Texts = texts,
                        Lines = lines,
                        IsLightingCandidate = isLighting,
                        IsBoundaryCandidate = isBoundary
                    };
                })
                .OrderByDescending(l => l.Inserts + l.ClosedPolylines)
                .ToList();

            // Find best lighting candidate (prefer lighting keywords, then max inserts)
            string? suggestedLighting = layerGroups
                .Where(l => l.IsLightingCandidate)
                .OrderByDescending(l => l.Inserts)
                .FirstOrDefault()?.Name
                ?? layerGroups.Where(l => l.Inserts > 0).OrderByDescending(l => l.Inserts).FirstOrDefault()?.Name;

            // Find best boundary candidate (prefer boundary keywords with closed polylines)
            string? suggestedBoundary = layerGroups
                .Where(l => l.IsBoundaryCandidate && l.ClosedPolylines > 0)
                .OrderByDescending(l => l.ClosedPolylines)
                .FirstOrDefault()?.Name
                ?? layerGroups.Where(l => l.ClosedPolylines > 0).OrderByDescending(l => l.ClosedPolylines).FirstOrDefault()?.Name;

            // Detect floor names in texts
            var detectedFloors = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var allTexts = doc.Entities
                .Where(e => e is MText || e is TextEntity)
                .Select(e => CleanCadText((e is MText mt) ? mt.Value : ((TextEntity)e).Value))
                .Where(v => !string.IsNullOrWhiteSpace(v));

            foreach (var t in allTexts)
            {
                string u = t.ToUpperInvariant();
                if (u.Contains("BASEMENT") || u.Contains("LOWER GROUND")) detectedFloors.Add("Basement");
                else if (u.Contains("GROUND FLOOR") || u.Contains("LEVEL 0")) detectedFloors.Add("Ground Floor");
                else if (u.Contains("FIRST FLOOR") || u.Contains("1ST FLOOR") || u.Contains("LEVEL 1")) detectedFloors.Add("First Floor");
                else if (u.Contains("SECOND FLOOR") || u.Contains("2ND FLOOR") || u.Contains("LEVEL 2")) detectedFloors.Add("Second Floor");
                else if (u.Contains("ROOF")) detectedFloors.Add("Roof");
            }

            if (!detectedFloors.Any())
            {
                detectedFloors.Add("Ground Floor");
            }

            var result = new
            {
                success = true,
                totalEntities = doc.Entities.Count(),
                layers = layerGroups,
                suggestedLightingLayer = suggestedLighting ?? "",
                suggestedBoundaryLayer = suggestedBoundary ?? "",
                availableFloors = detectedFloors.OrderBy(f => f).ToList()
            };

            Console.WriteLine(JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true }));
            return 0;
        }

        private static int ParseDrawing(CadDocument doc, string? lightingLayer, string? boundaryLayer, string defaultFloor)
        {
            // 1. Gather lighting block inserts
            var insertsQuery = doc.Entities.OfType<Insert>().AsEnumerable();
            if (!string.IsNullOrWhiteSpace(lightingLayer) && lightingLayer != "*")
            {
                insertsQuery = insertsQuery.Where(i => string.Equals(i.Layer?.Name, lightingLayer, StringComparison.OrdinalIgnoreCase));
            }
            else
            {
                // Auto-pick layer with lighting keyword or max inserts
                var bestGroup = doc.Entities.OfType<Insert>()
                    .GroupBy(i => i.Layer?.Name ?? "")
                    .OrderByDescending(g => (g.Key.Contains("Light", StringComparison.OrdinalIgnoreCase) || g.Key.Contains("Lum", StringComparison.OrdinalIgnoreCase) ? 10000 : 0) + g.Count())
                    .FirstOrDefault();

                if (bestGroup != null)
                {
                    insertsQuery = bestGroup;
                }
            }

            var lightingInserts = insertsQuery.ToList();
            if (!lightingInserts.Any())
            {
                Console.WriteLine(JsonSerializer.Serialize(new
                {
                    success = false,
                    error = $"No block insertions found on layer '{lightingLayer ?? "auto-detected"}'."
                }));
                return 1;
            }

            // 2. Gather candidate texts for tags
            // Include texts on lighting layer and also nearby general texts
            var tagTexts = doc.Entities
                .Where(e => (e is MText || e is TextEntity))
                .Select(e => new
                {
                    Layer = e.Layer?.Name ?? "",
                    Pt = (e is MText mt) ? mt.InsertPoint : ((TextEntity)e).InsertPoint,
                    Val = CleanCadText((e is MText mt2) ? mt2.Value : ((TextEntity)e).Value),
                    IsOnLightingLayer = !string.IsNullOrWhiteSpace(lightingLayer) && string.Equals(e.Layer?.Name, lightingLayer, StringComparison.OrdinalIgnoreCase)
                })
                .Where(t => !string.IsNullOrWhiteSpace(t.Val) && IsTagCandidate(t.Val))
                .ToList();

            // 3. Gather closed polylines for room/count boundaries
            var polyQuery = doc.Entities.OfType<LwPolyline>()
                .Where(p => p.IsClosed && p.Vertices.Count >= 3)
                .AsEnumerable();

            if (!string.IsNullOrWhiteSpace(boundaryLayer) && boundaryLayer != "*")
            {
                polyQuery = polyQuery.Where(p => string.Equals(p.Layer?.Name, boundaryLayer, StringComparison.OrdinalIgnoreCase));
            }

            var closedPolys = polyQuery.ToList();

            // 4. Gather all texts for room naming and floor identification
            var allTexts = doc.Entities
                .Where(e => e is MText || e is TextEntity)
                .Select(e => new
                {
                    Layer = e.Layer?.Name ?? "",
                    Pt = (e is MText mt) ? mt.InsertPoint : ((TextEntity)e).InsertPoint,
                    Val = CleanCadText((e is MText mt2) ? mt2.Value : ((TextEntity)e).Value)
                })
                .Where(t => !string.IsNullOrWhiteSpace(t.Val) && t.Val.Length < 60)
                .ToList();

            // 5. Precompute room boundaries
            var roomBoundaries = new List<RoomBoundary>();
            foreach (var poly in closedPolys)
            {
                double area = CalculateArea(poly.Vertices);
                if (area < 10.0) continue; // Skip degenerate polylines

                var textsInside = allTexts.Where(t => IsPointInPolyline(t.Pt, poly)).ToList();

                string roomFloor = defaultFloor;
                string roomName = "";
                bool floorFound = false;

                foreach (var t in textsInside)
                {
                    string u = t.Val.ToUpperInvariant();
                    if (!floorFound)
                    {
                        if (u.Contains("BASEMENT") || u.Contains("LOWER GROUND") || u.Contains("LGF"))
                        {
                            roomFloor = "Basement";
                            floorFound = true;
                        }
                        else if (u.Contains("FIRST FLOOR") || u.Contains("1ST FLOOR") || u.Contains("LEVEL 1") || u.Contains("FF"))
                        {
                            roomFloor = "First Floor";
                            floorFound = true;
                        }
                        else if (u.Contains("SECOND FLOOR") || u.Contains("2ND FLOOR") || u.Contains("LEVEL 2"))
                        {
                            roomFloor = "Second Floor";
                            floorFound = true;
                        }
                        else if (u.Contains("GROUND FLOOR") || u.Contains("LEVEL 0") || u.Contains("GF"))
                        {
                            roomFloor = "Ground Floor";
                            floorFound = true;
                        }
                        else if (u.Contains("ROOF"))
                        {
                            roomFloor = "Roof";
                            floorFound = true;
                        }
                    }

                    if (string.IsNullOrEmpty(roomName) && IsValidRoomName(t.Val))
                    {
                        roomName = t.Val;
                    }
                }

                if (string.IsNullOrWhiteSpace(roomName))
                {
                    // If no explicit room label inside, use floor name or layer name
                    roomName = roomFloor != defaultFloor ? $"{roomFloor} Area" : (poly.Layer?.Name ?? "Area");
                }

                roomBoundaries.Add(new RoomBoundary
                {
                    Polyline = poly,
                    Area = area,
                    Floor = roomFloor,
                    RoomName = roomName
                });
            }

            // 6. Match each insert to nearest tag and enclosing room
            var rawItems = new List<CountItem>();

            foreach (var ins in lightingInserts)
            {
                var pt = ins.InsertPoint;

                // Priority 1: Check block attributes
                string tag = "";
                if (ins.Attributes != null && ins.Attributes.Any())
                {
                    var codeAttr = ins.Attributes.FirstOrDefault(a =>
                        a.Tag.Equals("CODE", StringComparison.OrdinalIgnoreCase) ||
                        a.Tag.Equals("TAG", StringComparison.OrdinalIgnoreCase) ||
                        a.Tag.Equals("PLAN_CODE", StringComparison.OrdinalIgnoreCase) ||
                        a.Tag.Equals("MARK", StringComparison.OrdinalIgnoreCase) ||
                        a.Tag.Equals("TYPE", StringComparison.OrdinalIgnoreCase));

                    if (codeAttr != null && !string.IsNullOrWhiteSpace(codeAttr.Value))
                    {
                        tag = CleanCadText(codeAttr.Value);
                    }
                }

                // Priority 2: Nearest text on lighting layer (within 3000 units), fallback to all candidate texts
                if (string.IsNullOrWhiteSpace(tag))
                {
                    var candidateTexts = tagTexts.Where(t => t.IsOnLightingLayer).ToList();
                    if (!candidateTexts.Any()) candidateTexts = tagTexts;

                    double minTextDist = double.MaxValue;
                    foreach (var t in candidateTexts)
                    {
                        double dist = Math.Sqrt(Math.Pow(pt.X - t.Pt.X, 2) + Math.Pow(pt.Y - t.Pt.Y, 2));
                        if (dist < minTextDist)
                        {
                            minTextDist = dist;
                            tag = t.Val;
                        }
                    }
                }

                // Priority 3: Block definition name
                if (string.IsNullOrWhiteSpace(tag))
                {
                    tag = ins.Block?.Name ?? "UNKNOWN";
                }

                // Normalize tag (e.g. capitalize, strip whitespace)
                tag = tag.Trim();

                // Find smallest enclosing room boundary
                RoomBoundary? bestBoundary = null;
                double minArea = double.MaxValue;

                foreach (var rb in roomBoundaries)
                {
                    if (IsPointInPolyline(pt, rb.Polyline))
                    {
                        if (rb.Area < minArea)
                        {
                            minArea = rb.Area;
                            bestBoundary = rb;
                        }
                    }
                }

                string finalFloor = bestBoundary?.Floor ?? defaultFloor;
                string finalArea = bestBoundary?.RoomName ?? "Landscape / External";

                rawItems.Add(new CountItem
                {
                    Floor = finalFloor,
                    Area = finalArea,
                    Tag = tag
                });
            }

            // 7. Aggregate by (Floor, Area, Tag)
            var aggregated = rawItems
                .GroupBy(r => new { r.Floor, r.Area, r.Tag })
                .Select(g => new
                {
                    floor = g.Key.Floor,
                    area = g.Key.Area,
                    tag = g.Key.Tag,
                    qty = g.Count()
                })
                .OrderBy(r => r.floor)
                .ThenBy(r => r.area)
                .ThenBy(r => r.tag)
                .ToList();

            var result = new
            {
                success = true,
                summary = new
                {
                    totalFittings = rawItems.Count,
                    totalRooms = aggregated.Select(a => a.area).Distinct().Count(),
                    uniqueTags = aggregated.Select(a => a.tag).Distinct().Count()
                },
                items = aggregated
            };

            Console.WriteLine(JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true }));
            return 0;
        }

        private static string CleanCadText(string val)
        {
            if (string.IsNullOrEmpty(val)) return "";
            // Remove formatting braces { ... }
            val = Regex.Replace(val, @"\{[^\}]*\}", "").Trim();
            // Remove MText control codes like \f...; or \P or \S...^...;
            val = Regex.Replace(val, @"\\[A-Za-z0-9]+;?", "").Trim();
            // Replace newlines and tabs with spaces
            val = Regex.Replace(val, @"[\r\n\t]+", " ").Trim();
            return val;
        }

        private static bool IsTagCandidate(string val)
        {
            if (string.IsNullOrWhiteSpace(val)) return false;
            if (val.Length > 25) return false;
            string u = val.ToUpperInvariant();
            if (u.Contains("DETAIL") || u.Contains("DWG") || u.Contains("SCALE") || u.Contains("REV") || u.Contains("DATE")) return false;
            if (u.Contains("@") || u.Contains("=") || u.Contains("GRADIENT") || u.Contains("RAMP") || u.Contains("MM")) return false;
            return true;
        }

        private static bool IsValidRoomName(string val)
        {
            if (string.IsNullOrWhiteSpace(val)) return false;
            string u = val.ToUpperInvariant();
            if (u.Contains("DETAIL") || u.Contains("DWG") || u.Contains("SCALE") || u.Contains("REVISION") || u.Contains("LEGEND")) return false;
            if (u.StartsWith("Y1") || u.StartsWith("BL") || u.StartsWith("FTX") || u.StartsWith("G1") || u.StartsWith("G2")) return false;
            if (u.Contains("@") || u.Contains("=") || u.Contains("TOC") || u.Contains("1:") || u.Contains("RAMP")) return false;
            return val.Length > 2 && val.Length <= 40;
        }

        private static double CalculateArea(IList<LwPolyline.Vertex> vertices)
        {
            double area = 0;
            int count = vertices.Count;
            for (int i = 0; i < count; i++)
            {
                var p1 = vertices[i].Location;
                var p2 = vertices[(i + 1) % count].Location;
                area += (p1.X * p2.Y) - (p2.X * p1.Y);
            }
            return Math.Abs(area) / 2.0;
        }

        private static bool IsPointInPolyline(XYZ point, LwPolyline polyline)
        {
            int count = polyline.Vertices.Count;
            bool isInside = false;
            for (int i = 0, j = count - 1; i < count; j = i++)
            {
                var vi = polyline.Vertices[i].Location;
                var vj = polyline.Vertices[j].Location;
                if (((vi.Y > point.Y) != (vj.Y > point.Y)) &&
                    (point.X < (vj.X - vi.X) * (point.Y - vi.Y) / (vj.Y - vi.Y) + vi.X))
                {
                    isInside = !isInside;
                }
            }
            return isInside;
        }

        private class LayerInfo
        {
            [JsonPropertyName("name")]
            public string Name { get; set; } = "";

            [JsonPropertyName("inserts")]
            public int Inserts { get; set; }

            [JsonPropertyName("closedPolylines")]
            public int ClosedPolylines { get; set; }

            [JsonPropertyName("totalPolylines")]
            public int TotalPolylines { get; set; }

            [JsonPropertyName("texts")]
            public int Texts { get; set; }

            [JsonPropertyName("lines")]
            public int Lines { get; set; }

            [JsonPropertyName("isLightingCandidate")]
            public bool IsLightingCandidate { get; set; }

            [JsonPropertyName("isBoundaryCandidate")]
            public bool IsBoundaryCandidate { get; set; }
        }

        private class RoomBoundary
        {
            public LwPolyline Polyline { get; set; } = null!;
            public double Area { get; set; }
            public string Floor { get; set; } = "";
            public string RoomName { get; set; } = "";
        }

        private class CountItem
        {
            public string Floor { get; set; } = "";
            public string Area { get; set; } = "";
            public string Tag { get; set; } = "";
        }
    }
}
