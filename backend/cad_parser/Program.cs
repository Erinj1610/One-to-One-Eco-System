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
                        error = $"Unknown command: {command}"
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
                    string name = g.Key;
                    int inserts = g.OfType<Insert>().Count();
                    int closedPolys = g.OfType<LwPolyline>().Count(p => p.IsClosed);
                    int totalPolys = g.OfType<LwPolyline>().Count();
                    int texts = g.Count(e => e is MText || e is TextEntity);

                    string lower = name.ToLowerInvariant();
                    bool isLighting = lower.StartsWith("e-lum") || lower.Contains("light") || lower.Contains("lum") || lower.Contains("lamp") || lower.Contains("p-block");
                    bool isBoundary = lower.Contains("area") || lower.Contains("bound") || lower.Contains("room") || lower.Contains("space") || lower.Contains("layout") || lower.Contains("count");

                    return new LayerInfo
                    {
                        Name = name,
                        Inserts = inserts,
                        ClosedPolylines = closedPolys,
                        TotalPolylines = totalPolys,
                        Texts = texts,
                        IsLightingCandidate = isLighting,
                        IsBoundaryCandidate = isBoundary
                    };
                })
                .OrderByDescending(l => l.Inserts + l.ClosedPolylines)
                .ToList();

            int totalLightingInserts = layerGroups.Where(l => l.IsLightingCandidate).Sum(l => l.Inserts);

            // Default suggested lighting layer is "*" (all lighting layers) when lighting layers are present
            string suggestedLighting = "*";
            if (totalLightingInserts == 0)
            {
                suggestedLighting = layerGroups.Where(l => l.Inserts > 0).OrderByDescending(l => l.Inserts).FirstOrDefault()?.Name ?? "*";
            }

            // Find best boundary candidate (prefer boundary keywords with closed polylines)
            string? suggestedBoundary = layerGroups
                .Where(l => l.IsBoundaryCandidate && l.ClosedPolylines > 0)
                .OrderByDescending(l => l.ClosedPolylines)
                .FirstOrDefault()?.Name
                ?? "*";

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
                totalLightingInserts = totalLightingInserts > 0 ? totalLightingInserts : layerGroups.Sum(l => l.Inserts),
                layers = layerGroups,
                suggestedLightingLayer = suggestedLighting,
                suggestedBoundaryLayer = suggestedBoundary,
                availableFloors = detectedFloors.OrderBy(f => f).ToList()
            };

            Console.WriteLine(JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true }));
            return 0;
        }

        private static int ParseDrawing(CadDocument doc, string? lightingLayer, string? boundaryLayer, string defaultFloor)
        {
            // 1. Gather lighting block inserts
            List<Insert> lightingInserts;
            if (string.IsNullOrWhiteSpace(lightingLayer) || lightingLayer == "*")
            {
                var candidateInserts = doc.Entities.OfType<Insert>()
                    .Where(i =>
                    {
                        string l = (i.Layer?.Name ?? "").ToUpperInvariant();
                        return l.StartsWith("E-LUM") || l.Contains("LIGHT") || l.Contains("LUM") || l.Contains("LAMP") || l.Contains("P-BLOCK");
                    })
                    .ToList();

                if (candidateInserts.Any())
                {
                    lightingInserts = candidateInserts;
                }
                else
                {
                    var bestGroup = doc.Entities.OfType<Insert>()
                        .GroupBy(i => i.Layer?.Name ?? "")
                        .OrderByDescending(g => g.Count())
                        .FirstOrDefault();

                    lightingInserts = bestGroup?.ToList() ?? new List<Insert>();
                }
            }
            else
            {
                lightingInserts = doc.Entities.OfType<Insert>()
                    .Where(i => string.Equals(i.Layer?.Name, lightingLayer, StringComparison.OrdinalIgnoreCase))
                    .ToList();
            }

            if (!lightingInserts.Any())
            {
                Console.WriteLine(JsonSerializer.Serialize(new
                {
                    success = false,
                    error = $"No block insertions found on lighting layer '{lightingLayer ?? "All Lighting Layers"}'."
                }));
                return 1;
            }

            // 2. Gather Room Labels (A-AREA-IDEN, A-LABEL-*, *ROOM*, *AREA*, etc.)
            var roomTexts = doc.Entities.Where(e => e is MText || e is TextEntity)
                .Where(e => {
                    string l = (e.Layer?.Name ?? "").ToUpperInvariant();
                    return l.Contains("AREA") || l.Contains("LABEL") || l.Contains("ROOM") || l.Contains("SPACE") || l.Contains("ZONE");
                })
                .Select(e => new
                {
                    Layer = e.Layer?.Name ?? "",
                    Val = CleanCadText((e is MText mt) ? mt.Value : ((TextEntity)e).Value),
                    Pt = (e is MText mt2) ? mt2.InsertPoint : ((TextEntity)e).InsertPoint
                })
                .Where(t => !string.IsNullOrWhiteSpace(t.Val) && IsValidRoomLabel(t.Val))
                .ToList();

            // 3. Gather candidate texts for Plan Code Tags
            var tagTexts = doc.Entities
                .Where(e => (e is MText || e is TextEntity))
                .Where(e => {
                    string l = (e.Layer?.Name ?? "").ToUpperInvariant();
                    if (l.Contains("AREA") || l.Contains("LABEL") || l.Contains("ROOM") || l.Contains("DIM") || l.Contains("WALL") || l.Contains("FURNITURE"))
                        return false;
                    return l.StartsWith("E-LUM") || l.Contains("LIGHT") || l.Contains("P-BLOCK") || (!string.IsNullOrWhiteSpace(lightingLayer) && l == lightingLayer.ToUpperInvariant());
                })
                .Select(e => new
                {
                    Layer = e.Layer?.Name ?? "",
                    Pt = (e is MText mt) ? mt.InsertPoint : ((TextEntity)e).InsertPoint,
                    Val = CleanCadText((e is MText mt2) ? mt2.Value : ((TextEntity)e).Value),
                    IsOnLightingLayer = !string.IsNullOrWhiteSpace(lightingLayer) && string.Equals(e.Layer?.Name, lightingLayer, StringComparison.OrdinalIgnoreCase)
                })
                .Where(t => !string.IsNullOrWhiteSpace(t.Val) && IsValidTag(t.Val))
                .ToList();

            // 4. Gather closed polylines for room/count boundaries
            var polyQuery = doc.Entities.OfType<LwPolyline>()
                .Where(p => p.IsClosed && p.Vertices.Count >= 3)
                .AsEnumerable();

            if (!string.IsNullOrWhiteSpace(boundaryLayer) && boundaryLayer != "*")
            {
                polyQuery = polyQuery.Where(p => string.Equals(p.Layer?.Name, boundaryLayer, StringComparison.OrdinalIgnoreCase));
            }

            var closedPolys = polyQuery.ToList();

            // 5. Precompute room boundaries with names
            var roomBoundaries = new List<RoomBoundary>();
            foreach (var poly in closedPolys)
            {
                double area = CalculateArea(poly.Vertices);
                if (area < 10.0 || area > 500000000.0) continue; // Skip degenerate specks or giant drawing sheet borders

                string polyLayer = (poly.Layer?.Name ?? "").ToUpperInvariant();
                // Never treat furniture, doors, windows, walls, beams, columns as rooms
                if (polyLayer.Contains("FURN") || polyLayer.Contains("DOOR") || polyLayer.Contains("GLAZ") || 
                    polyLayer.Contains("WALL") || polyLayer.Contains("BEAM") || polyLayer.Contains("COL") ||
                    polyLayer.Contains("SANR") || polyLayer.Contains("CASE"))
                {
                    continue;
                }

                // Check if any room text is inside
                var insideTexts = roomTexts.Where(r => IsPointInPolyline(r.Pt, poly)).ToList();
                string roomName = "";
                if (insideTexts.Any())
                {
                    roomName = insideTexts.First().Val;
                }
                else if (polyLayer.Contains("ROOM") || polyLayer.Contains("ZONE") || polyLayer.Contains("SPACE"))
                {
                    roomName = poly.Layer!.Name;
                }

                if (!string.IsNullOrWhiteSpace(roomName))
                {
                    roomBoundaries.Add(new RoomBoundary
                    {
                        Polyline = poly,
                        Area = area,
                        Floor = defaultFloor,
                        RoomName = roomName
                    });
                }
            }

            // 6. Match each insert to nearest plan code tag and enclosing room
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

                // Priority 2: Nearest text on lighting layer (prefer texts within 2500 units)
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

                    // If closest tag text is too far away (> 2500 units), fallback to block definition name
                    if (minTextDist > 2500.0)
                    {
                        tag = ins.Block?.Name ?? "UNKNOWN";
                    }
                }

                // Priority 3: Block definition name
                if (string.IsNullOrWhiteSpace(tag))
                {
                    tag = ins.Block?.Name ?? "UNKNOWN";
                }

                tag = tag.Trim().ToUpperInvariant();

                // Determine Room Name:
                // Method A: Smallest enclosing polygon with a named room
                string finalRoom = "";
                var enclosing = roomBoundaries
                    .Where(rb => !string.IsNullOrWhiteSpace(rb.RoomName) && IsPointInPolyline(pt, rb.Polyline))
                    .OrderBy(rb => rb.Area)
                    .ToList();

                if (enclosing.Any())
                {
                    finalRoom = enclosing.First().RoomName;
                }
                else if (roomTexts.Any())
                {
                    // Method B: Nearest room label
                    double minRoomDist = double.MaxValue;
                    foreach (var r in roomTexts)
                    {
                        double dist = Math.Sqrt(Math.Pow(pt.X - r.Pt.X, 2) + Math.Pow(pt.Y - r.Pt.Y, 2));
                        if (dist < minRoomDist)
                        {
                            minRoomDist = dist;
                            finalRoom = r.Val;
                        }
                    }
                }

                if (string.IsNullOrWhiteSpace(finalRoom))
                {
                    finalRoom = "General Area";
                }

                rawItems.Add(new CountItem
                {
                    Floor = defaultFloor,
                    Area = finalRoom,
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
                .OrderBy(r => r.area)
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
            string s = val;
            // 1. Replace paragraph breaks (\P) with spaces
            s = Regex.Replace(s, @"\\P", " ", RegexOptions.IgnoreCase);
            // 2. Remove all AutoCAD formatting codes ending with semicolon (\pxqc;, \pxt2;, \f...;, \C...;, etc.)
            s = Regex.Replace(s, @"\\[^;]*;", "");
            // 3. Remove single escaped tags
            s = Regex.Replace(s, @"\\[A-Za-z0-9]+", "");
            // 4. Strip curly braces { and } while keeping inner text!
            s = s.Replace("{", "").Replace("}", "");
            // 5. Replace newlines, tabs, and multiple spaces with single space
            s = Regex.Replace(s, @"[\r\n\t]+", " ");
            s = Regex.Replace(s, @"\s+", " ").Trim();
            return s;
        }

        private static bool IsValidTag(string val)
        {
            if (string.IsNullOrWhiteSpace(val)) return false;
            string u = val.ToUpperInvariant();
            // Reject drawing metadata, dates, or titles
            if (u.Contains("PLAN") || u.Contains("DATE") || u.Contains("SCALE") || u.Contains("REV") || u.Contains("DETAIL") || u.Contains("ART WALL")) return false;
            if (u.Contains("DINING") || u.Contains("PASSAGE") || u.Contains("CELLAR") || u.Contains("KITCHEN") || u.Contains("EXTERIOR") || u.Contains("DELI")) return false;
            // Exclude electrical circuit IDs that contain dots e.g. WC1.H1, REST.B10, WC2.I1
            if (u.Contains(".") || u.Contains("REST") || u.Contains("CIRC")) return false;
            if (u.Contains("@") || u.Contains("=") || u.Contains("GRADIENT") || u.Contains("RAMP") || u.Contains("MM")) return false;
            return val.Length >= 1 && val.Length <= 10;
        }

        private static bool IsValidRoomLabel(string val)
        {
            if (string.IsNullOrWhiteSpace(val)) return false;
            string u = val.ToUpperInvariant();
            // Exclude drawing title blocks, dates, scales, notes, revision blocks
            if (u.Contains("PLAN") || u.Contains("DRAWING") || u.Contains("DATE") || u.Contains("SCALE") || u.Contains("REV") || u.Contains("DETAIL")) return false;
            if (u.Contains("2024") || u.Contains("2025") || u.Contains("2026") || u.Contains("PROJECT") || u.Contains("ARCHITECT") || u.Contains("COPYRIGHT") || u.Contains("DWG")) return false;
            if (u.Contains("LEGEND") || u.Contains("NOTES") || u.Contains("GENERAL") || u.Contains("ARRANGEMENT")) return false;
            if (u.Contains("@") || u.Contains("=") || u.Contains("1:") || u.Contains("MM")) return false;
            return val.Length >= 2 && val.Length <= 45;
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
