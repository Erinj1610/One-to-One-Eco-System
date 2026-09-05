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

            // Suggested lighting layer is "*" (all lighting layers) when lighting layers are present
            string suggestedLighting = "*";
            if (totalLightingInserts == 0)
            {
                suggestedLighting = layerGroups.Where(l => l.Inserts > 0).OrderByDescending(l => l.Inserts).FirstOrDefault()?.Name ?? "*";
            }

            // Find best boundary candidate
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
            // 1. Gather Room Labels (A-AREA-IDEN, A-LABEL-*, *ROOM*, *AREA*, etc.)
            var roomTexts = doc.Entities.Where(e => e is MText || e is TextEntity)
                .Where(e => {
                    string l = (e.Layer?.Name ?? "").ToUpperInvariant();
                    return l.Contains("AREA") || l.Contains("LABEL") || l.Contains("ROOM") || l.Contains("SPACE") || l.Contains("ZONE");
                })
                .Select(e => new TextLabel
                {
                    Layer = e.Layer?.Name ?? "",
                    Val = CleanCadText((e is MText mt) ? mt.Value : ((TextEntity)e).Value),
                    Pt = (e is MText mt2) ? mt2.InsertPoint : ((TextEntity)e).InsertPoint
                })
                .Where(t => !string.IsNullOrWhiteSpace(t.Val) && IsValidRoomLabel(t.Val))
                .ToList();

            // 2. Gather candidate texts for Plan Code Tags
            var tagTexts = doc.Entities
                .Where(e => (e is MText || e is TextEntity))
                .Where(e => {
                    string l = (e.Layer?.Name ?? "").ToUpperInvariant();
                    if (l.Contains("AREA") || l.Contains("LABEL") || l.Contains("ROOM") || l.Contains("DIM") || l.Contains("WALL") || l.Contains("FURNITURE") || l.Contains("CIRC"))
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

            // 3. Gather closed polylines for room/count boundaries
            var polyQuery = doc.Entities.OfType<LwPolyline>()
                .Where(p => p.IsClosed && p.Vertices.Count >= 3)
                .AsEnumerable();

            if (!string.IsNullOrWhiteSpace(boundaryLayer) && boundaryLayer != "*")
            {
                polyQuery = polyQuery.Where(p => string.Equals(p.Layer?.Name, boundaryLayer, StringComparison.OrdinalIgnoreCase));
            }

            var closedPolys = polyQuery.ToList();

            var roomBoundaries = new List<RoomBoundary>();
            foreach (var poly in closedPolys)
            {
                double area = CalculateArea(poly.Vertices);
                if (area < 10.0 || area > 500000000.0) continue; // Skip specks or sheet borders

                string polyLayer = (poly.Layer?.Name ?? "").ToUpperInvariant();
                if (polyLayer.Contains("FURN") || polyLayer.Contains("DOOR") || polyLayer.Contains("GLAZ") || 
                    polyLayer.Contains("WALL") || polyLayer.Contains("BEAM") || polyLayer.Contains("COL") ||
                    polyLayer.Contains("SANR") || polyLayer.Contains("CASE"))
                {
                    continue;
                }

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

            // 4. Gather Driver/Controller blocks (e.g. LC, DRIVER, POWER_FEED)
            var driverInserts = doc.Entities.OfType<Insert>()
                .Where(i =>
                {
                    string bName = (i.Block?.Name ?? "").ToUpperInvariant();
                    string lName = (i.Layer?.Name ?? "").ToUpperInvariant();
                    return bName.Contains("LC") || bName.Contains("DRIVER") || bName.Contains("CTRL") || bName.Contains("FEED") ||
                           lName.Contains("DRIVER") || lName.Contains("LC");
                })
                .ToList();

            // -------------------------------------------------------------
            // A. STANDARD LIGHTING BLOCK INSERTS (FIXTURES)
            // -------------------------------------------------------------
            List<Insert> lightingInserts;
            if (string.IsNullOrWhiteSpace(lightingLayer) || lightingLayer == "*")
            {
                var candidateInserts = doc.Entities.OfType<Insert>()
                    .Where(i =>
                    {
                        string l = (i.Layer?.Name ?? "").ToUpperInvariant();
                        string b = (i.Block?.Name ?? "").ToUpperInvariant();
                        // Ignore pure driver blocks like 'LC' from being counted as independent downlights/fixtures
                        if (b == "LC" || b.Contains("DRIVER") || b.Contains("FEED")) return false;
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
                    .Where(i => (i.Block?.Name ?? "").ToUpperInvariant() != "LC")
                    .ToList();
            }

            var fixtureItems = new List<ParsedItem>();

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
                string finalRoom = ResolveRoomName(pt, roomBoundaries, roomTexts);

                fixtureItems.Add(new ParsedItem
                {
                    Floor = defaultFloor,
                    Area = finalRoom,
                    Tag = tag,
                    ItemType = "fixture",
                    Qty = 1,
                    Unit = "pcs"
                });
            }

            // Aggregate fixtures by (Floor, Area, Tag)
            var aggregatedFixtures = fixtureItems
                .GroupBy(r => new { r.Floor, r.Area, r.Tag })
                .Select(g => new ParsedItem
                {
                    Floor = g.Key.Floor,
                    Area = g.Key.Area,
                    Tag = g.Key.Tag,
                    ItemType = "fixture",
                    Qty = g.Count(),
                    Unit = "pcs",
                    LengthMeters = 0,
                    RunIndex = 0,
                    Notes = $"{g.Count()} units"
                })
                .ToList();

            // -------------------------------------------------------------
            // B. LINEAR LED RUN EXTRACTION
            // -------------------------------------------------------------
            var ledPolylines = doc.Entities.OfType<LwPolyline>()
                .Where(p =>
                {
                    string l = (p.Layer?.Name ?? "").ToUpperInvariant();
                    // Match LED layers or specified lighting layer if it has polylines
                    if (l.Contains("LED") || l.Contains("STRIP") || l.Contains("COVE") || l.Contains("PROFILE") || l.Contains("NEON") || l.Contains("FLEX"))
                        return true;
                    if (!string.IsNullOrWhiteSpace(lightingLayer) && lightingLayer != "*" && string.Equals(p.Layer?.Name, lightingLayer, StringComparison.OrdinalIgnoreCase))
                        return true;
                    return false;
                })
                .ToList();

            var rawLedRuns = new List<ParsedItem>();

            foreach (var poly in ledPolylines)
            {
                double totalLen = CalculatePolylineLength(poly);
                // Skip micro specks or hatch patterns (< 150mm)
                if (totalLen < 150.0) continue;

                double lenMeters = Math.Round(totalLen / 1000.0, 2);

                // Compute polyline midpoint
                double midX = poly.Vertices.Average(v => v.Location.X);
                double midY = poly.Vertices.Average(v => v.Location.Y);
                var midPt = new XYZ(midX, midY, 0);

                string roomName = ResolveRoomName(midPt, roomBoundaries, roomTexts);

                // Check for driver block near endpoints (within 300mm)
                var startPt = new XYZ(poly.Vertices.First().Location.X, poly.Vertices.First().Location.Y, 0);
                var endPt = new XYZ(poly.Vertices.Last().Location.X, poly.Vertices.Last().Location.Y, 0);

                string driverInfo = "";
                var nearbyDriver = driverInserts.FirstOrDefault(d =>
                {
                    double d1 = Math.Sqrt(Math.Pow(d.InsertPoint.X - startPt.X, 2) + Math.Pow(d.InsertPoint.Y - startPt.Y, 2));
                    double d2 = Math.Sqrt(Math.Pow(d.InsertPoint.X - endPt.X, 2) + Math.Pow(d.InsertPoint.Y - endPt.Y, 2));
                    return d1 < 300.0 || d2 < 300.0;
                });

                if (nearbyDriver != null)
                {
                    driverInfo = nearbyDriver.Block?.Name ?? "LC";
                }

                // Look for nearby tag text (e.g. L1, LED1) within 1500mm
                string tag = "";
                var nearestTag = tagTexts.Where(t => t.IsOnLightingLayer || t.Layer.ToUpper().Contains("LED"))
                    .OrderBy(t => Math.Sqrt(Math.Pow(t.Pt.X - midX, 2) + Math.Pow(t.Pt.Y - midY, 2)))
                    .FirstOrDefault();

                if (nearestTag != null)
                {
                    double dist = Math.Sqrt(Math.Pow(nearestTag.Pt.X - midX, 2) + Math.Pow(nearestTag.Pt.Y - midY, 2));
                    if (dist < 1500.0)
                    {
                        tag = nearestTag.Val;
                    }
                }

                if (string.IsNullOrWhiteSpace(tag))
                {
                    tag = "LED";
                }

                rawLedRuns.Add(new ParsedItem
                {
                    Floor = defaultFloor,
                    Area = roomName,
                    Tag = tag,
                    ItemType = "linear_led",
                    Qty = lenMeters,
                    Unit = "m",
                    LengthMeters = lenMeters,
                    Driver = driverInfo,
                    Notes = $"Length: {lenMeters:F2}m" + (!string.IsNullOrWhiteSpace(driverInfo) ? $" | Driver: {driverInfo} at terminus" : "")
                });
            }

            // Assign individual run numbers per room (Run 1, Run 2, Run 3...)
            var sequencedLedRuns = rawLedRuns
                .GroupBy(r => new { r.Floor, r.Area })
                .SelectMany(g =>
                {
                    int runIdx = 1;
                    return g.OrderByDescending(r => r.LengthMeters).Select(item =>
                    {
                        item.RunIndex = runIdx;
                        string prefix = g.Count() > 1 ? $"LED Run {runIdx}" : "LED Run 1";
                        item.Notes = $"{prefix} ({item.LengthMeters:F2}m) — Extrusion & Strip" + (!string.IsNullOrWhiteSpace(item.Driver) ? $" | Driver: {item.Driver} at terminus" : "");
                        runIdx++;
                        return item;
                    });
                })
                .ToList();

            // -------------------------------------------------------------
            // C. TRACK LIGHTING RUN EXTRACTION & ACCESSORY BOM
            // -------------------------------------------------------------
            var trackPolylines = doc.Entities.OfType<LwPolyline>()
                .Where(p =>
                {
                    string l = (p.Layer?.Name ?? "").ToUpperInvariant();
                    return l.Contains("TRK") || l.Contains("TRACK");
                })
                .ToList();

            var sequencedTrackRuns = new List<ParsedItem>();
            int trackIdx = 1;

            foreach (var poly in trackPolylines)
            {
                double totalLen = CalculatePolylineLength(poly);
                if (totalLen < 200.0) continue; // Skip small profile cross-sections (< 200mm)

                double trackLenM = Math.Round(totalLen / 1000.0, 2);

                double midX = poly.Vertices.Average(v => v.Location.X);
                double midY = poly.Vertices.Average(v => v.Location.Y);
                var midPt = new XYZ(midX, midY, 0);

                string roomName = ResolveRoomName(midPt, roomBoundaries, roomTexts);

                // Calculate standard modular sections (2.0m standard track rails)
                int modularSections = (int)Math.Ceiling(trackLenM / 2.0);
                int straightCouplers = Math.Max(0, modularSections - 1);

                // Terminations: 1 Live End feed, and (if open) 1 End Cap
                int endCaps = poly.IsClosed ? 0 : 1;
                int liveEnds = 1;

                // Count 90-degree corner turns
                int lJoiners = CountCornerAngles(poly.Vertices);

                var accessories = new List<AccessoryItem>
                {
                    new AccessoryItem { Name = "Live End / Power Feed", Qty = liveEnds }
                };

                if (endCaps > 0)
                {
                    accessories.Add(new AccessoryItem { Name = "End Cap", Qty = endCaps });
                }

                if (straightCouplers > 0)
                {
                    accessories.Add(new AccessoryItem { Name = "Straight Coupler / Joiner", Qty = straightCouplers });
                }

                if (lJoiners > 0)
                {
                    accessories.Add(new AccessoryItem { Name = "L-Joiner (90° Corner)", Qty = lJoiners });
                }

                string accSummary = string.Join(", ", accessories.Select(a => $"{a.Qty}x {a.Name}"));

                sequencedTrackRuns.Add(new ParsedItem
                {
                    Floor = defaultFloor,
                    Area = roomName,
                    Tag = "TRK",
                    ItemType = "track_system",
                    Qty = trackLenM,
                    Unit = "m",
                    LengthMeters = trackLenM,
                    RunIndex = trackIdx,
                    Notes = $"Track Run {trackIdx} ({trackLenM:F2}m) | Accessories: {accSummary}",
                    Accessories = accessories
                });

                trackIdx++;
            }

            // -------------------------------------------------------------
            // D. COMBINE AND FORMAT FINAL RESULTS
            // -------------------------------------------------------------
            var allItems = new List<ParsedItem>();
            allItems.AddRange(aggregatedFixtures);
            allItems.AddRange(sequencedLedRuns);
            allItems.AddRange(sequencedTrackRuns);

            if (!allItems.Any())
            {
                Console.WriteLine(JsonSerializer.Serialize(new
                {
                    success = false,
                    error = $"No lighting fixtures, LED strips, or track systems found on requested layers."
                }));
                return 1;
            }

            var orderedItems = allItems
                .OrderBy(r => r.Area)
                .ThenBy(r => r.Tag)
                .ThenBy(r => r.RunIndex)
                .ToList();

            var result = new
            {
                success = true,
                summary = new
                {
                    totalFittings = aggregatedFixtures.Sum(f => (int)f.Qty),
                    totalLedRuns = sequencedLedRuns.Count,
                    totalLedMeters = Math.Round(sequencedLedRuns.Sum(l => l.LengthMeters), 2),
                    totalTrackRuns = sequencedTrackRuns.Count,
                    totalTrackMeters = Math.Round(sequencedTrackRuns.Sum(t => t.LengthMeters), 2),
                    totalRooms = orderedItems.Select(a => a.Area).Distinct().Count(),
                    uniqueTags = orderedItems.Select(a => a.Tag).Distinct().Count()
                },
                items = orderedItems
            };

            Console.WriteLine(JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true }));
            return 0;
        }

        private static string ResolveRoomName(XYZ pt, List<RoomBoundary> boundaries, List<TextLabel> roomTexts)
        {
            var enclosing = boundaries
                .Where(rb => !string.IsNullOrWhiteSpace(rb.RoomName) && IsPointInPolyline(pt, rb.Polyline))
                .OrderBy(rb => rb.Area)
                .ToList();

            if (enclosing.Any())
            {
                return enclosing.First().RoomName;
            }

            if (roomTexts.Any())
            {
                double minRoomDist = double.MaxValue;
                string bestName = "";
                foreach (var r in roomTexts)
                {
                    double dist = Math.Sqrt(Math.Pow(pt.X - r.Pt.X, 2) + Math.Pow(pt.Y - r.Pt.Y, 2));
                    if (dist < minRoomDist)
                    {
                        minRoomDist = dist;
                        bestName = r.Val;
                    }
                }
                if (!string.IsNullOrWhiteSpace(bestName)) return bestName;
            }

            return "General Area";
        }

        private static double CalculatePolylineLength(LwPolyline poly)
        {
            double total = 0;
            var verts = poly.Vertices;
            for (int i = 0; i < verts.Count - 1; i++)
            {
                var v1 = verts[i];
                var v2 = verts[i + 1];
                double dx = v2.Location.X - v1.Location.X;
                double dy = v2.Location.Y - v1.Location.Y;
                double segDist = Math.Sqrt(dx * dx + dy * dy);

                if (v1.Bulge != 0)
                {
                    double theta = 4.0 * Math.Atan(v1.Bulge);
                    segDist = Math.Abs(segDist / (2.0 * Math.Sin(theta / 2.0)) * theta);
                }

                total += segDist;
            }

            if (poly.IsClosed && verts.Count > 1)
            {
                var v1 = verts.Last();
                var v2 = verts.First();
                double dx = v2.Location.X - v1.Location.X;
                double dy = v2.Location.Y - v1.Location.Y;
                total += Math.Sqrt(dx * dx + dy * dy);
            }

            return total;
        }

        private static int CountCornerAngles(IList<LwPolyline.Vertex> verts)
        {
            int corners = 0;
            for (int i = 1; i < verts.Count - 1; i++)
            {
                var pPrev = verts[i - 1].Location;
                var pCurr = verts[i].Location;
                var pNext = verts[i + 1].Location;

                double v1x = pCurr.X - pPrev.X;
                double v1y = pCurr.Y - pPrev.Y;
                double v2x = pNext.X - pCurr.X;
                double v2y = pNext.Y - pCurr.Y;

                double dot = v1x * v2x + v1y * v2y;
                double mag1 = Math.Sqrt(v1x * v1x + v1y * v1y);
                double mag2 = Math.Sqrt(v2x * v2x + v2y * v2y);

                if (mag1 > 0 && mag2 > 0)
                {
                    double cosAngle = Math.Clamp(dot / (mag1 * mag2), -1.0, 1.0);
                    double angleDeg = Math.Acos(cosAngle) * (180.0 / Math.PI);
                    // If turn angle is roughly 90 degrees (between 70 and 110 degrees)
                    if (angleDeg >= 70.0 && angleDeg <= 110.0)
                    {
                        corners++;
                    }
                }
            }
            return corners;
        }

        private static string CleanCadText(string val)
        {
            if (string.IsNullOrEmpty(val)) return "";
            string s = val;
            s = Regex.Replace(s, @"\\P", " ", RegexOptions.IgnoreCase);
            s = Regex.Replace(s, @"\\[^;]*;", "");
            s = Regex.Replace(s, @"\\[A-Za-z0-9]+", "");
            s = s.Replace("{", "").Replace("}", "");
            s = Regex.Replace(s, @"[\r\n\t]+", " ");
            s = Regex.Replace(s, @"\s+", " ").Trim();
            return s;
        }

        private static bool IsValidTag(string val)
        {
            if (string.IsNullOrWhiteSpace(val)) return false;
            string u = val.ToUpperInvariant();
            if (u.Contains("PLAN") || u.Contains("DATE") || u.Contains("SCALE") || u.Contains("REV") || u.Contains("DETAIL") || u.Contains("ART WALL")) return false;
            if (u.Contains("DINING") || u.Contains("PASSAGE") || u.Contains("CELLAR") || u.Contains("KITCHEN") || u.Contains("EXTERIOR") || u.Contains("DELI")) return false;
            if (u.Contains(".") || u.Contains("REST") || u.Contains("CIRC") || u == "LC" || u.Contains("DRIVER")) return false;
            if (u.Contains("@") || u.Contains("=") || u.Contains("GRADIENT") || u.Contains("RAMP") || u.Contains("MM")) return false;
            return val.Length >= 1 && val.Length <= 10;
        }

        private static bool IsValidRoomLabel(string val)
        {
            if (string.IsNullOrWhiteSpace(val)) return false;
            string u = val.ToUpperInvariant();
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

                public class TextLabel
        {
            public string Layer { get; set; } = "";
            public string Val { get; set; } = "";
            public XYZ Pt { get; set; } = new XYZ();
        }

        public class LayerInfo
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

        public class RoomBoundary
        {
            public LwPolyline Polyline { get; set; } = null!;
            public double Area { get; set; }
            public string Floor { get; set; } = "";
            public string RoomName { get; set; } = "";
        }

        public class ParsedItem
        {
            [JsonPropertyName("floor")]
            public string Floor { get; set; } = "";

            [JsonPropertyName("area")]
            public string Area { get; set; } = "";

            [JsonPropertyName("tag")]
            public string Tag { get; set; } = "";

            [JsonPropertyName("itemType")]
            public string ItemType { get; set; } = "fixture"; // "fixture", "linear_led", "track_system"

            [JsonPropertyName("qty")]
            public double Qty { get; set; } = 1;

            [JsonPropertyName("unit")]
            public string Unit { get; set; } = "pcs"; // "pcs", "m"

            [JsonPropertyName("lengthMeters")]
            public double LengthMeters { get; set; } = 0;

            [JsonPropertyName("runIndex")]
            public int RunIndex { get; set; } = 0;

            [JsonPropertyName("notes")]
            public string Notes { get; set; } = "";

            [JsonPropertyName("driver")]
            public string Driver { get; set; } = "";

            [JsonPropertyName("accessories")]
            public List<AccessoryItem> Accessories { get; set; } = new();
        }

        public class AccessoryItem
        {
            [JsonPropertyName("name")]
            public string Name { get; set; } = "";

            [JsonPropertyName("qty")]
            public int Qty { get; set; } = 1;
        }
    }
}
