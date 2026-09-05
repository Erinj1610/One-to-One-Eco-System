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
        private static readonly HashSet<string> RoomKeywords = new(StringComparer.OrdinalIgnoreCase)
        {
            "ROOM", "AREA", "ZONE", "SPACE", "DINING", "SEATING", "KITCHEN", "PREP", "COUNTER",
            "SERVERY", "STATION", "FREEZER", "COLD", "CHILLER", "WASH", "SCULLERY", "ENTRANCE",
            "ENTRY", "FOYER", "LOBBY", "PASSAGE", "CORRIDOR", "HALL", "OFFICE", "STORE",
            "STOREROOM", "STAFF", "CREW", "TOILET", "TOILETS", "WC", "RESTROOM", "BATHROOM",
            "MALL", "BAR", "PLANT", "ELECTRICAL", "SERVER", "PATIO", "BALCONY",
            "TERRACE", "PORCH", "GARAGE", "BEDROOM", "LIVING", "LOUNGE", "SUITE", "CLOSET",
            "PANTRY", "LAUNDRY", "ATTIC", "BASEMENT", "CELLAR", "STAIR", "STAIRWAY", "STAIRCASE",
            "VOID", "DELIVERY", "RECEIVING", "DISPATCH", "YARD", "DECK",
            "MEZZANINE", "CANOPY", "AISLE", "BOOTHS", "MALE", "FEMALE", "CUSTOMER", "GENTS",
            "LADIES", "DISABLED", "CLOAKS", "LOCKER", "SECURITY", "INTERNAL", "EXTERNAL",
            "ORDER", "OVEN", "VEG", "POT", "COLDRINK", "STORAGE", "UP", "UNISEX"
        };

        private static readonly HashSet<string> NonRoomExcludes = new(StringComparer.OrdinalIgnoreCase)
        {
            "DUCT", "SHAFT", "SERVICE SHAFT", "BIN", "MIRROR", "COLUMN", "CONDUIT", "SLAB", "SHOPFRONT", "SHOPFRONTS",
            "FHR", "DB", "KDS", "DETAIL", "MANUAL", "EL", "RD", "PF", "LC", "DRIVER", "FEED", "CIRCUIT",
            "H-COLUMN", "FRAME", "FRAMES", "CAMEL", "CONFIRMED"
        };

        public static int Main(string[] args)
        {
            if (args.Length < 2)
            {
                Console.WriteLine(JsonSerializer.Serialize(new
                {
                    success = false,
                    error = "Usage: CadParser <inspect|parse> <file.dwg> [--engine <1.0|2.0>] [--lighting-layer <name>] [--boundary-layer <name>] [--default-floor <name>]"
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

            string engine = "2.0";
            string? lightingLayer = null;
            string? boundaryLayer = null;
            string defaultFloor = "Ground Floor";

            for (int i = 2; i < args.Length; i++)
            {
                if (args[i] == "--engine" && i + 1 < args.Length)
                {
                    engine = args[++i];
                }
                else if (args[i] == "--lighting-layer" && i + 1 < args.Length)
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
                using var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read, 65536, FileOptions.SequentialScan);
                using var reader = new DwgReader(stream);
                var doc = reader.Read();

                if (command == "inspect")
                {
                    return InspectDrawing(doc);
                }
                else if (command == "parse")
                {
                    if (engine == "1.0")
                    {
                        return ParseDrawingV1(doc, lightingLayer, boundaryLayer, defaultFloor);
                    }
                    else
                    {
                        return ParseDrawingV2(doc, lightingLayer, boundaryLayer, defaultFloor);
                    }
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

            string suggestedLighting = "*";
            if (totalLightingInserts == 0)
            {
                suggestedLighting = layerGroups.Where(l => l.Inserts > 0).OrderByDescending(l => l.Inserts).FirstOrDefault()?.Name ?? "*";
            }

            string? suggestedBoundary = layerGroups
                .Where(l => l.IsBoundaryCandidate && l.ClosedPolylines > 0)
                .OrderByDescending(l => l.ClosedPolylines)
                .FirstOrDefault()?.Name
                ?? "*";

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

        // =============================================================
        // ENGINE 1.0 (CLASSIC LAYER-BASED EXTRACTION)
        // =============================================================
        private static int ParseDrawingV1(CadDocument doc, string? lightingLayer, string? boundaryLayer, string defaultFloor)
        {
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
                if (area < 10.0 || area > 500000000.0) continue;

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

            var driverInserts = doc.Entities.OfType<Insert>()
                .Where(i =>
                {
                    string bName = (i.Block?.Name ?? "").ToUpperInvariant();
                    string lName = (i.Layer?.Name ?? "").ToUpperInvariant();
                    return bName.Contains("LC") || bName.Contains("DRIVER") || bName.Contains("CTRL") || bName.Contains("FEED") ||
                           lName.Contains("DRIVER") || lName.Contains("LC");
                })
                .ToList();

            List<Insert> lightingInserts;
            if (string.IsNullOrWhiteSpace(lightingLayer) || lightingLayer == "*")
            {
                var candidateInserts = doc.Entities.OfType<Insert>()
                    .Where(i =>
                    {
                        string l = (i.Layer?.Name ?? "").ToUpperInvariant();
                        string b = (i.Block?.Name ?? "").ToUpperInvariant();
                        if (b == "LC" || b.Contains("DRIVER") || b.Contains("FEED")) return false;
                        return l.StartsWith("E-LUM") || l.Contains("LIGHT") || l.Contains("LUM") || l.Contains("LAMP") || l.Contains("P-BLOCK");
                    })
                    .ToList();

                lightingInserts = candidateInserts.Any() ? candidateInserts : new List<Insert>();
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

                if (string.IsNullOrWhiteSpace(tag))
                {
                    string bClean = CleanBlockName(ins.Block?.Name ?? "");
                    string prefix = bClean.Length >= 1 ? bClean.Substring(0, 1) : "";

                    var candidateTexts = tagTexts
                        .Where(t => !IsLinearLedTag(t.Val) && t.Val != "RD" && t.Val != "PF" && t.Val != "EL" && t.Val != "LC")
                        .Where(t => t.IsOnLightingLayer)
                        .ToList();
                    if (!candidateTexts.Any())
                    {
                        candidateTexts = tagTexts
                            .Where(t => !IsLinearLedTag(t.Val) && t.Val != "RD" && t.Val != "PF" && t.Val != "EL" && t.Val != "LC")
                            .ToList();
                    }

                    var nearbyCandidates = candidateTexts
                        .Select(t => new { t.Val, Dist = Math.Sqrt(Math.Pow(pt.X - t.Pt.X, 2) + Math.Pow(pt.Y - t.Pt.Y, 2)) })
                        .Where(t => t.Dist <= 1500.0)
                        .OrderBy(t => t.Dist)
                        .ToList();

                    var prefixMatch = nearbyCandidates.FirstOrDefault(t =>
                        string.Equals(t.Val, bClean, StringComparison.OrdinalIgnoreCase) ||
                        (!string.IsNullOrEmpty(prefix) && t.Val.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)));

                    if (prefixMatch != null)
                    {
                        tag = prefixMatch.Val;
                    }
                    else if (nearbyCandidates.Any() && nearbyCandidates.First().Dist <= 1200.0)
                    {
                        tag = nearbyCandidates.First().Val;
                    }
                    else
                    {
                        tag = bClean;
                    }
                }

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

            var ledPolylines = doc.Entities.OfType<LwPolyline>()
                .Where(p =>
                {
                    string l = (p.Layer?.Name ?? "").ToUpperInvariant();
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
                if (totalLen < 500.0) continue;

                double lenMeters = Math.Round(totalLen / 1000.0, 2);

                double midX = poly.Vertices.Average(v => v.Location.X);
                double midY = poly.Vertices.Average(v => v.Location.Y);
                var midPt = new XYZ(midX, midY, 0);

                string roomName = ResolveRoomName(midPt, roomBoundaries, roomTexts);

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

                string tag = "";
                var nearestTag = tagTexts
                    .Where(t => IsLinearLedTag(t.Val))
                    .OrderBy(t => Math.Sqrt(Math.Pow(t.Pt.X - midX, 2) + Math.Pow(t.Pt.Y - midY, 2)))
                    .FirstOrDefault();

                if (nearestTag != null)
                {
                    double dist = Math.Sqrt(Math.Pow(nearestTag.Pt.X - midX, 2) + Math.Pow(nearestTag.Pt.Y - midY, 2));
                    if (dist < 2500.0)
                    {
                        tag = nearestTag.Val;
                    }
                }

                if (string.IsNullOrWhiteSpace(tag))
                {
                    tag = "LED Strip";
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
                if (totalLen < 200.0) continue;

                double trackLenM = Math.Round(totalLen / 1000.0, 2);

                double midX = poly.Vertices.Average(v => v.Location.X);
                double midY = poly.Vertices.Average(v => v.Location.Y);
                var midPt = new XYZ(midX, midY, 0);

                string roomName = ResolveRoomName(midPt, roomBoundaries, roomTexts);

                int modularSections = (int)Math.Ceiling(trackLenM / 2.0);
                int straightCouplers = Math.Max(0, modularSections - 1);
                int endCaps = poly.IsClosed ? 0 : 1;
                int liveEnds = 1;
                int lJoiners = CountCornerAngles(poly.Vertices);

                var accessories = new List<AccessoryItem>
                {
                    new AccessoryItem { Name = "Live End / Power Feed", Qty = liveEnds }
                };

                if (endCaps > 0) accessories.Add(new AccessoryItem { Name = "End Cap", Qty = endCaps });
                if (straightCouplers > 0) accessories.Add(new AccessoryItem { Name = "Straight Coupler / Joiner", Qty = straightCouplers });
                if (lJoiners > 0) accessories.Add(new AccessoryItem { Name = "L-Joiner (90° Corner)", Qty = lJoiners });

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
                engine = "1.0",
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

        // =============================================================
        // ENGINE 2.0 DETERMINISTIC MODE (FOR STANDARDIZED 0- LAYERS)
        // =============================================================
        private static bool HasStandardZeroLayers(CadDocument doc)
        {
            return doc.Entities.Any(e =>
            {
                string l = (e.Layer?.Name ?? "").ToUpperInvariant();
                return l.StartsWith("0-FITTING") || l.StartsWith("0-ROOM") || l.StartsWith("0-FLOOR") || l.StartsWith("0-LED") || l.StartsWith("0-TRACK");
            });
        }

        private static int ParseDrawingDeterministic(CadDocument doc, string defaultFloor)
        {
            // 1. Gather Floors from 0-FLOORS
            var floorPolys = doc.Entities.OfType<LwPolyline>()
                .Where(p => p.IsClosed && (p.Layer?.Name ?? "").ToUpperInvariant().StartsWith("0-FLOOR"))
                .ToList();

            var floorTexts = doc.Entities.Where(e => (e is MText || e is TextEntity) && (e.Layer?.Name ?? "").ToUpperInvariant().StartsWith("0-FLOOR"))
                .Select(e => new TextLabel
                {
                    Layer = e.Layer?.Name ?? "",
                    Val = CleanCadText((e is MText mt) ? mt.Value : ((TextEntity)e).Value),
                    Pt = (e is MText mt2) ? mt2.InsertPoint : ((TextEntity)e).InsertPoint
                })
                .Where(t => !string.IsNullOrWhiteSpace(t.Val))
                .ToList();

            var floorBoundaries = new List<(LwPolyline Poly, string Name)>();
            foreach (var fp in floorPolys)
            {
                var inside = floorTexts.FirstOrDefault(t => IsPointInPolyline(t.Pt, fp));
                string fName = inside != null ? inside.Val : defaultFloor;
                floorBoundaries.Add((fp, fName));
            }

            string ResolveFloorName(XYZ pt)
            {
                var match = floorBoundaries.FirstOrDefault(fb => IsPointInPolyline(pt, fb.Poly));
                return match.Name ?? defaultFloor;
            }

            // 2. Gather Rooms from 0-ROOMS
            var roomPolys = doc.Entities.OfType<LwPolyline>()
                .Where(p => p.IsClosed && (p.Layer?.Name ?? "").ToUpperInvariant().StartsWith("0-ROOM"))
                .ToList();

            var roomTexts = doc.Entities.Where(e => (e is MText || e is TextEntity) && (e.Layer?.Name ?? "").ToUpperInvariant().StartsWith("0-ROOM"))
                .Select(e => new TextLabel
                {
                    Layer = e.Layer?.Name ?? "",
                    Val = CleanCadText((e is MText mt) ? mt.Value : ((TextEntity)e).Value),
                    Pt = (e is MText mt2) ? mt2.InsertPoint : ((TextEntity)e).InsertPoint
                })
                .Where(t => !string.IsNullOrWhiteSpace(t.Val))
                .ToList();

            var roomBoundaries = new List<RoomBoundary>();
            foreach (var rp in roomPolys)
            {
                double area = CalculateArea(rp.Vertices);
                var inside = roomTexts.FirstOrDefault(t => IsPointInPolyline(t.Pt, rp));
                string rName = inside != null ? inside.Val : "General Area";
                double cx = rp.Vertices.Average(v => v.Location.X);
                double cy = rp.Vertices.Average(v => v.Location.Y);
                string flr = ResolveFloorName(new XYZ(cx, cy, 0));

                roomBoundaries.Add(new RoomBoundary
                {
                    Polyline = rp,
                    RoomName = rName,
                    Floor = flr,
                    Area = area
                });
            }

            string ResolveRoom(XYZ pt)
            {
                var enclosing = roomBoundaries
                    .Where(rb => IsPointInPolyline(pt, rb.Polyline))
                    .OrderBy(rb => rb.Area)
                    .FirstOrDefault();
                return enclosing?.RoomName ?? "General Area";
            }

            // 3. Gather Point Fixtures from 0-FITTINGS
            var fittingInserts = doc.Entities.OfType<Insert>()
                .Where(i => (i.Layer?.Name ?? "").ToUpperInvariant().StartsWith("0-FITTING"))
                .ToList();

            var fittingTexts = doc.Entities.Where(e => (e is MText || e is TextEntity) && (e.Layer?.Name ?? "").ToUpperInvariant().StartsWith("0-FITTING"))
                .Select(e => new TextLabel
                {
                    Layer = e.Layer?.Name ?? "",
                    Val = CleanCadText((e is MText mt) ? mt.Value : ((TextEntity)e).Value),
                    Pt = (e is MText mt2) ? mt2.InsertPoint : ((TextEntity)e).InsertPoint
                })
                .Where(t => !string.IsNullOrWhiteSpace(t.Val))
                .ToList();

            var fixtureItems = new List<ParsedItem>();
            foreach (var ins in fittingInserts)
            {
                var pt = ins.InsertPoint;
                string tag = "";

                if (ins.Attributes != null && ins.Attributes.Any())
                {
                    var codeAttr = ins.Attributes.FirstOrDefault(a =>
                        a.Tag.Equals("CODE", StringComparison.OrdinalIgnoreCase) ||
                        a.Tag.Equals("TAG", StringComparison.OrdinalIgnoreCase) ||
                        a.Tag.Equals("PLAN_CODE", StringComparison.OrdinalIgnoreCase));
                    if (codeAttr != null && !string.IsNullOrWhiteSpace(codeAttr.Value))
                        tag = CleanCadText(codeAttr.Value);
                }

                if (string.IsNullOrWhiteSpace(tag))
                {
                    var nearest = fittingTexts
                        .Select(t => new { t.Val, Dist = Math.Sqrt(Math.Pow(pt.X - t.Pt.X, 2) + Math.Pow(pt.Y - t.Pt.Y, 2)) })
                        .Where(t => t.Dist <= 1800.0)
                        .OrderBy(t => t.Dist)
                        .FirstOrDefault();

                    tag = nearest?.Val ?? CleanBlockName(ins.Block?.Name ?? "");
                }

                tag = tag.Trim().ToUpperInvariant();
                string room = ResolveRoom(pt);
                string floor = ResolveFloorName(pt);

                fixtureItems.Add(new ParsedItem
                {
                    Floor = floor,
                    Area = room,
                    Tag = tag,
                    ItemType = "fixture",
                    Qty = 1,
                    Unit = "pcs",
                    LengthMeters = 0,
                    RunIndex = 0,
                    Notes = ""
                });
            }

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

            // 4. Gather Linear LEDs from 0-LEDS (and polylines on 0-FITTINGS)
            var ledPolylines = doc.Entities.OfType<LwPolyline>()
                .Where(p =>
                {
                    string l = (p.Layer?.Name ?? "").ToUpperInvariant();
                    return l.StartsWith("0-LED") || (!p.IsClosed && l.StartsWith("0-FITTING"));
                })
                .ToList();

            var ledTexts = doc.Entities.Where(e => (e is MText || e is TextEntity) && ((e.Layer?.Name ?? "").ToUpperInvariant().StartsWith("0-LED") || (e.Layer?.Name ?? "").ToUpperInvariant().StartsWith("0-FITTING")))
                .Select(e => new TextLabel
                {
                    Layer = e.Layer?.Name ?? "",
                    Val = CleanCadText((e is MText mt) ? mt.Value : ((TextEntity)e).Value),
                    Pt = (e is MText mt2) ? mt2.InsertPoint : ((TextEntity)e).InsertPoint
                })
                .Where(t => !string.IsNullOrWhiteSpace(t.Val) && IsLinearLedTag(t.Val))
                .ToList();

            var rawLedRuns = new List<ParsedItem>();
            foreach (var poly in ledPolylines)
            {
                double totalLen = CalculatePolylineLength(poly);
                if (totalLen < 500.0) continue;

                double lenMeters = Math.Round(totalLen / 1000.0, 2);
                double midX = poly.Vertices.Average(v => v.Location.X);
                double midY = poly.Vertices.Average(v => v.Location.Y);
                var midPt = new XYZ(midX, midY, 0);

                string roomName = ResolveRoom(midPt);
                string floorName = ResolveFloorName(midPt);

                var nearest = ledTexts
                    .Select(t => new { t.Val, Dist = Math.Sqrt(Math.Pow(t.Pt.X - midX, 2) + Math.Pow(t.Pt.Y - midY, 2)) })
                    .Where(t => t.Dist <= 3500.0)
                    .OrderBy(t => t.Dist)
                    .FirstOrDefault();

                string tag = nearest?.Val ?? "LED Strip";

                rawLedRuns.Add(new ParsedItem
                {
                    Floor = floorName,
                    Area = roomName,
                    Tag = tag,
                    ItemType = "linear_led",
                    Qty = lenMeters,
                    Unit = "m",
                    LengthMeters = lenMeters,
                    Notes = $"Length: {lenMeters:F2}m"
                });
            }

            var sequencedLedRuns = rawLedRuns
                .GroupBy(r => new { r.Floor, r.Area })
                .SelectMany(g =>
                {
                    int runIdx = 1;
                    return g.OrderByDescending(r => r.LengthMeters).Select(item =>
                    {
                        item.RunIndex = runIdx;
                        string prefix = g.Count() > 1 ? $"LED Run {runIdx}" : "LED Run 1";
                        item.Notes = $"{prefix} ({item.LengthMeters:F2}m) — Extrusion & Strip";
                        runIdx++;
                        return item;
                    });
                })
                .ToList();

            // 5. Gather Track Systems from 0-TRACKS
            var trackPolylines = doc.Entities.OfType<LwPolyline>()
                .Where(p => (p.Layer?.Name ?? "").ToUpperInvariant().StartsWith("0-TRACK"))
                .ToList();

            var trackSpots = doc.Entities.OfType<Insert>()
                .Where(i => (i.Layer?.Name ?? "").ToUpperInvariant().StartsWith("0-TRACK"))
                .ToList();

            var sequencedTrackRuns = new List<ParsedItem>();
            int trackIdx = 1;

            foreach (var poly in trackPolylines)
            {
                double totalLen = CalculatePolylineLength(poly);
                if (totalLen < 500.0) continue;

                double trackLenM = Math.Round(totalLen / 1000.0, 2);
                double midX = poly.Vertices.Average(v => v.Location.X);
                double midY = poly.Vertices.Average(v => v.Location.Y);
                var midPt = new XYZ(midX, midY, 0);

                string roomName = ResolveRoom(midPt);
                string floorName = ResolveFloorName(midPt);

                var mountedSpots = trackSpots.Where(ins =>
                {
                    var pt = ins.InsertPoint;
                    for (int i = 0; i < poly.Vertices.Count - 1; i++)
                    {
                        var v1 = poly.Vertices[i].Location;
                        var v2 = poly.Vertices[i + 1].Location;
                        double dist = DistanceToSegment(new XY(pt.X, pt.Y), v1, v2);
                        if (dist <= 400.0) return true;
                    }
                    return false;
                }).ToList();

                int modularSections = (int)Math.Ceiling(trackLenM / 2.0);
                int straightCouplers = Math.Max(0, modularSections - 1);
                int endCaps = poly.IsClosed ? 0 : 1;
                int liveEnds = 1;
                int lJoiners = CountCornerAngles(poly.Vertices);

                var accessories = new List<AccessoryItem>
                {
                    new AccessoryItem { Name = "Live End / Power Feed", Qty = liveEnds }
                };
                if (endCaps > 0) accessories.Add(new AccessoryItem { Name = "End Cap", Qty = endCaps });
                if (straightCouplers > 0) accessories.Add(new AccessoryItem { Name = "Straight Coupler / Joiner", Qty = straightCouplers });
                if (lJoiners > 0) accessories.Add(new AccessoryItem { Name = "L-Joiner (90° Corner)", Qty = lJoiners });

                string spotSummary = mountedSpots.Any() ? $" | Attached Spots: {mountedSpots.Count} heads" : "";
                string accSummary = string.Join(", ", accessories.Select(a => $"{a.Qty}x {a.Name}"));

                sequencedTrackRuns.Add(new ParsedItem
                {
                    Floor = floorName,
                    Area = roomName,
                    Tag = "TRK",
                    ItemType = "track_system",
                    Qty = trackLenM,
                    Unit = "m",
                    LengthMeters = trackLenM,
                    RunIndex = trackIdx,
                    Notes = $"Track Run {trackIdx} ({trackLenM:F2}m){spotSummary} | Accessories: {accSummary}",
                    Accessories = accessories
                });

                trackIdx++;
            }

            var allItems = new List<ParsedItem>();
            allItems.AddRange(aggregatedFixtures);
            allItems.AddRange(sequencedLedRuns);
            allItems.AddRange(sequencedTrackRuns);

            var orderedItems = allItems
                .OrderBy(r => r.Floor)
                .ThenBy(r => r.Area)
                .ThenBy(r => r.Tag)
                .ThenBy(r => r.RunIndex)
                .ToList();

            var result = new
            {
                success = true,
                engine = "2.0-deterministic",
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

        // =============================================================
        // ENGINE 2.0 (SMART ZERO-PREP: SHAPE FINGERPRINTING & WALL INFERENCE)
        // =============================================================
        private static int ParseDrawingV2(CadDocument doc, string? lightingLayer, string? boundaryLayer, string defaultFloor)
        {
            if (HasStandardZeroLayers(doc))
            {
                return ParseDrawingDeterministic(doc, defaultFloor);
            }

            // 1. Gather all architectural wall segments for obstacle-aware raycasting
            var wallSegments = new List<(XY Start, XY End)>();
            foreach (var e in doc.Entities)
            {
                string l = (e.Layer?.Name ?? "").ToUpperInvariant();
                if (l.Contains("WALL") || l.Contains("PARTITION") || l.Contains("BRICK") || l.Contains("MASONRY") || l.Contains("CONC"))
                {
                    if (e is Line line)
                    {
                        wallSegments.Add((new XY(line.StartPoint.X, line.StartPoint.Y), new XY(line.EndPoint.X, line.EndPoint.Y)));
                    }
                    else if (e is LwPolyline poly)
                    {
                        for (int i = 0; i < poly.Vertices.Count - 1; i++)
                        {
                            wallSegments.Add((poly.Vertices[i].Location, poly.Vertices[i + 1].Location));
                        }
                    }
                }
            }

            // 2. Determine lighting layer preference & filter
            bool hasDedicatedLumLayers = doc.Entities.Any(e => (e.Layer?.Name ?? "").ToUpperInvariant().StartsWith("E-LUM-"));

            // 3. Find primary lighting fixtures to determine floor plan bounding envelope
            var candidateInserts = doc.Entities.OfType<Insert>()
                .Where(i => !IsNonLightingBlock(i.Block?.Name ?? "", i.Layer?.Name ?? ""))
                .Where(i =>
                {
                    string l = (i.Layer?.Name ?? "").ToUpperInvariant();
                    if (!string.IsNullOrWhiteSpace(lightingLayer) && lightingLayer != "*")
                    {
                        return string.Equals(i.Layer?.Name, lightingLayer, StringComparison.OrdinalIgnoreCase);
                    }
                    if (hasDedicatedLumLayers)
                    {
                        return l.StartsWith("E-LUM-");
                    }
                    return l.StartsWith("E-LUM") || l.Contains("LIGHT") || l.Contains("LTG") || l.Contains("FIXTURE") || l.Contains("ELECT");
                })
                .ToList();

            double minX = 0, maxX = 0, minY = 0, maxY = 0;
            if (candidateInserts.Any())
            {
                minX = candidateInserts.Min(i => i.InsertPoint.X) - 15000.0;
                maxX = candidateInserts.Max(i => i.InsertPoint.X) + 15000.0;
                minY = candidateInserts.Min(i => i.InsertPoint.Y) - 15000.0;
                maxY = candidateInserts.Max(i => i.InsertPoint.Y) + 15000.0;
            }

            // 4. Gather Room Labels across all text layers within envelope
            var rawRoomTexts = doc.Entities.Where(e => e is MText || e is TextEntity)
                .Select(e => new TextLabel
                {
                    Layer = e.Layer?.Name ?? "",
                    Val = CleanCadText((e is MText mt) ? mt.Value : ((TextEntity)e).Value),
                    Pt = (e is MText mt2) ? mt2.InsertPoint : ((TextEntity)e).InsertPoint
                })
                .Where(t => candidateInserts.Count == 0 || (t.Pt.X >= minX && t.Pt.X <= maxX && t.Pt.Y >= minY && t.Pt.Y <= maxY))
                .Where(t => IsRoomTextCandidate(t.Val, t.Layer))
                .ToList();

            var roomTexts = MergeStackedRoomTexts(rawRoomTexts);

            // 5. Gather closed room boundary polylines if present (hybrid support)
            var roomBoundaries = new List<RoomBoundary>();
            var closedPolys = doc.Entities.OfType<LwPolyline>().Where(p => p.IsClosed && p.Vertices.Count >= 3).ToList();
            foreach (var poly in closedPolys)
            {
                double area = CalculateArea(poly.Vertices);
                if (area < 10.0 || area > 500000000.0) continue;
                string polyLayer = (poly.Layer?.Name ?? "").ToUpperInvariant();
                if (polyLayer.Contains("FURN") || polyLayer.Contains("DOOR") || polyLayer.Contains("GLAZ") || polyLayer.Contains("WALL") || polyLayer.Contains("SANR"))
                    continue;

                var insideTexts = roomTexts.Where(r => IsPointInPolyline(r.Pt, poly)).ToList();
                string roomName = insideTexts.Any() ? insideTexts.First().Val : (polyLayer.Contains("ROOM") || polyLayer.Contains("ZONE") ? poly.Layer!.Name : "");
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

            // 6. Gather candidate tag texts (for downlights & spot plan codes)
            var tagTexts = doc.Entities
                .Where(e => (e is MText || e is TextEntity))
                .Where(e => {
                    string l = (e.Layer?.Name ?? "").ToUpperInvariant();
                    if (l.Contains("AREA") || l.Contains("LABEL") || l.Contains("ROOM") || l.Contains("DIM") || l.Contains("WALL") || l.Contains("FURN") || l.Contains("CIRC"))
                        return false;
                    return true;
                })
                .Select(e => new TextLabel
                {
                    Layer = e.Layer?.Name ?? "",
                    Pt = (e is MText mt) ? mt.InsertPoint : ((TextEntity)e).InsertPoint,
                    Val = CleanCadText((e is MText mt2) ? mt2.Value : ((TextEntity)e).Value)
                })
                .Where(t => !string.IsNullOrWhiteSpace(t.Val) && IsValidTag(t.Val))
                .ToList();

            // 7. Parse Point Fixtures
            var fixtureItems = new List<ParsedItem>();
            foreach (var ins in candidateInserts)
            {
                string bName = ins.Block?.Name ?? "";
                string lName = ins.Layer?.Name ?? "";
                var pt = ins.InsertPoint;

                if (candidateInserts.Count > 10 && (pt.X < minX || pt.X > maxX || pt.Y < minY || pt.Y > maxY))
                    continue;

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

                if (string.IsNullOrWhiteSpace(tag))
                {
                    string bClean = CleanBlockName(bName);
                    string prefix = bClean.Length >= 1 ? bClean.Substring(0, 1) : "";

                    var candidateTexts = tagTexts
                        .Where(t => !IsLinearLedTag(t.Val) && t.Val != "RD" && t.Val != "PF" && t.Val != "EL" && t.Val != "LC")
                        .Where(t => t.Layer.ToUpper().Contains("LUM") || t.Layer.ToUpper().Contains("LIGHT") || string.Equals(t.Layer, lName, StringComparison.OrdinalIgnoreCase))
                        .ToList();
                    if (!candidateTexts.Any())
                    {
                        candidateTexts = tagTexts
                            .Where(t => !IsLinearLedTag(t.Val) && t.Val != "RD" && t.Val != "PF" && t.Val != "EL" && t.Val != "LC")
                            .ToList();
                    }

                    var nearbyCandidates = candidateTexts
                        .Select(t => new { t.Val, Dist = Math.Sqrt(Math.Pow(pt.X - t.Pt.X, 2) + Math.Pow(pt.Y - t.Pt.Y, 2)) })
                        .Where(t => t.Dist <= 1500.0)
                        .OrderBy(t => t.Dist)
                        .ToList();

                    // 1. Prefer text matching block prefix (e.g. Block A -> A1, A2; Block P -> P1, P2)
                    var prefixMatch = nearbyCandidates.FirstOrDefault(t =>
                        string.Equals(t.Val, bClean, StringComparison.OrdinalIgnoreCase) ||
                        (!string.IsNullOrEmpty(prefix) && t.Val.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)));

                    if (prefixMatch != null)
                    {
                        tag = prefixMatch.Val;
                    }
                    else if (nearbyCandidates.Any() && nearbyCandidates.First().Dist <= 1200.0)
                    {
                        // 2. If no prefix match, but an authentic plan code text is adjacent to the symbol (e.g. Block B1 -> A3; Block DP -> LF_03; Block WV -> LF_06)
                        tag = nearbyCandidates.First().Val;
                    }
                    else
                    {
                        tag = bClean;
                    }
                }

                if (string.IsNullOrWhiteSpace(tag))
                {
                    tag = CleanBlockName(bName);
                }

                tag = tag.Trim().ToUpperInvariant();
                string finalRoom = ResolveRoomNameV2(pt, roomBoundaries, roomTexts, wallSegments);

                fixtureItems.Add(new ParsedItem
                {
                    Floor = defaultFloor,
                    Area = finalRoom,
                    Tag = tag,
                    ItemType = "fixture",
                    Qty = 1,
                    Unit = "pcs",
                    LengthMeters = 0,
                    RunIndex = 0,
                    Notes = ""
                });
            }

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

            // 8. Parse Linear LED Polylines
            var ledPolylines = doc.Entities.OfType<LwPolyline>()
                .Where(p =>
                {
                    string l = (p.Layer?.Name ?? "").ToUpperInvariant();
                    if (!string.IsNullOrWhiteSpace(lightingLayer) && lightingLayer != "*")
                    {
                        return string.Equals(p.Layer?.Name, lightingLayer, StringComparison.OrdinalIgnoreCase);
                    }
                    if (hasDedicatedLumLayers && !l.StartsWith("E-LUM-")) return false;
                    if (l.StartsWith("A-") || l.StartsWith("S-") || l.StartsWith("M-") || l.StartsWith("P-"))
                    {
                        if (!l.Contains("LED") && !l.Contains("LUM") && !l.Contains("LIGHT")) return false;
                    }
                    return l.Contains("LED") || l.Contains("STRIP") || l.Contains("COVE") || l.Contains("NEON") || (l.Contains("PROFILE") && (l.Contains("LUM") || l.Contains("LIGHT") || l.Contains("E-")));
                })
                .ToList();

            var rawLedRuns = new List<ParsedItem>();
            foreach (var poly in ledPolylines)
            {
                double totalLen = CalculatePolylineLength(poly);
                if (totalLen < 500.0) continue;

                double midX = poly.Vertices.Average(v => v.Location.X);
                double midY = poly.Vertices.Average(v => v.Location.Y);
                if (candidateInserts.Count > 10 && (midX < minX || midX > maxX || midY < minY || midY > maxY))
                    continue;

                double lenMeters = Math.Round(totalLen / 1000.0, 2);
                var midPt = new XYZ(midX, midY, 0);
                string roomName = ResolveRoomNameV2(midPt, roomBoundaries, roomTexts, wallSegments);

                string tag = "";
                var linearCandidates = tagTexts
                    .Where(t => IsLinearLedTag(t.Val))
                    .Select(t => new { t.Val, Dist = Math.Sqrt(Math.Pow(t.Pt.X - midX, 2) + Math.Pow(t.Pt.Y - midY, 2)) })
                    .Where(t => t.Dist <= 3500.0)
                    .OrderBy(t => t.Dist)
                    .ToList();

                if (linearCandidates.Any())
                {
                    tag = linearCandidates.First().Val;
                }
                else
                {
                    tag = "LED Strip";
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
                    Notes = $"Length: {lenMeters:F2}m"
                });
            }

            var sequencedLedRuns = rawLedRuns
                .GroupBy(r => new { r.Floor, r.Area })
                .SelectMany(g =>
                {
                    int runIdx = 1;
                    return g.OrderByDescending(r => r.LengthMeters).Select(item =>
                    {
                        item.RunIndex = runIdx;
                        string prefix = g.Count() > 1 ? $"LED Run {runIdx}" : "LED Run 1";
                        item.Notes = $"{prefix} ({item.LengthMeters:F2}m) — Extrusion & Strip";
                        runIdx++;
                        return item;
                    });
                })
                .ToList();

            // 9. Parse Track Systems
            var trackPolylines = doc.Entities.OfType<LwPolyline>()
                .Where(p =>
                {
                    string l = (p.Layer?.Name ?? "").ToUpperInvariant();
                    if (!string.IsNullOrWhiteSpace(lightingLayer) && lightingLayer != "*")
                    {
                        return string.Equals(p.Layer?.Name, lightingLayer, StringComparison.OrdinalIgnoreCase);
                    }
                    if (hasDedicatedLumLayers && !l.StartsWith("E-LUM-")) return false;
                    return l.Contains("TRK") || l.Contains("TRACK");
                })
                .ToList();

            var sequencedTrackRuns = new List<ParsedItem>();
            int trackIdx = 1;

            foreach (var poly in trackPolylines)
            {
                double totalLen = CalculatePolylineLength(poly);
                if (totalLen < 500.0) continue;

                double trackLenM = Math.Round(totalLen / 1000.0, 2);

                double midX = poly.Vertices.Average(v => v.Location.X);
                double midY = poly.Vertices.Average(v => v.Location.Y);
                if (candidateInserts.Count > 10 && (midX < minX || midX > maxX || midY < minY || midY > maxY))
                    continue;

                var midPt = new XYZ(midX, midY, 0);
                string roomName = ResolveRoomNameV2(midPt, roomBoundaries, roomTexts, wallSegments);

                int modularSections = (int)Math.Ceiling(trackLenM / 2.0);
                int straightCouplers = Math.Max(0, modularSections - 1);
                int endCaps = poly.IsClosed ? 0 : 1;
                int liveEnds = 1;
                int lJoiners = CountCornerAngles(poly.Vertices);

                var accessories = new List<AccessoryItem>
                {
                    new AccessoryItem { Name = "Live End / Power Feed", Qty = liveEnds }
                };

                if (endCaps > 0) accessories.Add(new AccessoryItem { Name = "End Cap", Qty = endCaps });
                if (straightCouplers > 0) accessories.Add(new AccessoryItem { Name = "Straight Coupler / Joiner", Qty = straightCouplers });
                if (lJoiners > 0) accessories.Add(new AccessoryItem { Name = "L-Joiner (90° Corner)", Qty = lJoiners });

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

            var allItems = new List<ParsedItem>();
            allItems.AddRange(aggregatedFixtures);
            allItems.AddRange(sequencedLedRuns);
            allItems.AddRange(sequencedTrackRuns);

            if (!allItems.Any())
            {
                Console.WriteLine(JsonSerializer.Serialize(new
                {
                    success = false,
                    error = "Smart Engine 2.0 found no lighting symbols or runs in this drawing."
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
                engine = "2.0",
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

        // =============================================================
        // GEOMETRIC & SPATIAL HELPERS
        // =============================================================
        private static bool IsNonLightingBlock(string blockName, string layerName)
        {
            string b = blockName.ToUpperInvariant();
            string l = layerName.ToUpperInvariant();

            if (b == "LC" || b == "LJ" || b.StartsWith("BEAM") || b.Contains("DRIVER") || b.Contains("FEED")) return true;

            // Structural, architectural, plumbing, landscape, Casework, furniture layers
            if (l.StartsWith("S-") || l.StartsWith("A-") || l.StartsWith("M-") || l.StartsWith("P-") || 
                l.StartsWith("L-") || l.StartsWith("I-FURN") || l.Contains("FURN") || l.Contains("DOOR") || 
                l.Contains("GLAZ") || l.Contains("PLANT") || l.Contains("SANR") || l.Contains("CASE") || 
                l.Contains("BEAM") || l.Contains("COL") || l.Contains("ROOF") || l.Contains("FLOR") || 
                l.Contains("WALL") || l.Contains("IMPT") || l.Contains("DETL") || l.Contains("GENM"))
            {
                // Exception: if the layer explicitly says LUM or LIGHT or FIXTURE
                if (!l.Contains("LUM") && !l.Contains("LIGHT") && !l.Contains("LTG") && !l.Contains("FIXTURE"))
                    return true;
            }

            if (b.Contains("DOOR") || b.Contains("WINDOW") || b.Contains("GLAZ") || b.Contains("FURN") ||
                b.Contains("TOILET") || b.Contains("SINK") || b.Contains("BASIN") || b.Contains("BATH") ||
                b.Contains("PLANT") || b.Contains("BEDS") || b.Contains("TREE") || b.Contains("CAR") ||
                b.Contains("BEAM") || b.Contains("COLUMN") || b.Contains("RAFTER") || b.Contains("PURLIN") ||
                b.Contains("ENSCAPE") || b.Contains("TITLE") || b.Contains("NORTH") || b.Contains("ARROW") ||
                b.Contains("GRID") || b.Contains("SECTION") || b.Contains("CALLOUT") || b.Contains("ELEV") ||
                b.Contains("DOWNPIPE") || b.Contains("PIPE") || b.Contains("WALL") || b.Contains("MODEL") ||
                b.Contains("DWG-") || b.Contains("XREF") || b.Contains("SHEET") || b.Contains("REV"))
                return true;

            return false;
        }

        private static string CleanBlockName(string bName)
        {
            if (string.IsNullOrWhiteSpace(bName)) return "UNKNOWN";
            // Strip common CAD prefixes
            string s = bName;
            s = Regex.Replace(s, @"^(\*U|A-|E-|I-|M_)", "", RegexOptions.IgnoreCase);
            s = Regex.Replace(s, @"[-_]?[0-9]+[xX][0-9]+.*$", "");
            if (s.Length > 15) s = s.Substring(0, 15);
            return s.Trim().ToUpperInvariant();
        }

        private static string ResolveRoomName(XYZ pt, List<RoomBoundary> boundaries, List<TextLabel> roomTexts)
        {
            var enclosing = boundaries
                .Where(rb => !string.IsNullOrWhiteSpace(rb.RoomName) && IsPointInPolyline(pt, rb.Polyline))
                .OrderBy(rb => rb.Area)
                .ToList();

            if (enclosing.Any()) return enclosing.First().RoomName;

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

        private static string ResolveRoomNameV2(XYZ pt, List<RoomBoundary> boundaries, List<TextLabel> roomTexts, List<(XY Start, XY End)> wallSegments)
        {
            // Priority 1: Enclosing closed polyline if available
            var enclosing = boundaries
                .Where(rb => !string.IsNullOrWhiteSpace(rb.RoomName) && IsPointInPolyline(pt, rb.Polyline))
                .OrderBy(rb => rb.Area)
                .ToList();

            if (enclosing.Any()) return enclosing.First().RoomName;

            // Priority 2: Wall-Aware Voronoi Raycasting
            if (roomTexts.Any())
            {
                var point2D = new XY(pt.X, pt.Y);
                double bestScore = double.MaxValue;
                string bestName = "";

                foreach (var r in roomTexts)
                {
                    double dist = Math.Sqrt(Math.Pow(pt.X - r.Pt.X, 2) + Math.Pow(pt.Y - r.Pt.Y, 2));
                    var label2D = new XY(r.Pt.X, r.Pt.Y);

                    int wallCrossings = 0;
                    if (wallSegments.Count > 0 && dist < 25000.0) // Only raycast against walls within 25 meters
                    {
                        foreach (var w in wallSegments)
                        {
                            if (LineSegmentsIntersect(point2D, label2D, w.Start, w.End))
                            {
                                wallCrossings++;
                            }
                        }
                    }

                    // Penalize room labels separated by walls
                    double score = dist * (1.0 + 4.0 * wallCrossings);
                    if (score < bestScore)
                    {
                        bestScore = score;
                        bestName = r.Val;
                    }
                }

                if (!string.IsNullOrWhiteSpace(bestName)) return bestName;
            }

            return "General Area";
        }

        private static bool LineSegmentsIntersect(XY p1, XY p2, XY p3, XY p4)
        {
            double d1 = Direction(p3, p4, p1);
            double d2 = Direction(p3, p4, p2);
            double d3 = Direction(p1, p2, p3);
            double d4 = Direction(p1, p2, p4);

            if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
                ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0)))
                return true;

            return false;
        }

        private static double Direction(XY pi, XY pj, XY pk)
        {
            return (pk.X - pi.X) * (pj.Y - pi.Y) - (pj.X - pi.X) * (pk.Y - pi.Y);
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
                    if (angleDeg >= 70.0 && angleDeg <= 110.0)
                    {
                        corners++;
                    }
                }
            }
            return corners;
        }

        private static double DistanceToSegment(XY p, XY a, XY b)
        {
            double l2 = Math.Pow(b.X - a.X, 2) + Math.Pow(b.Y - a.Y, 2);
            if (l2 == 0) return Math.Sqrt(Math.Pow(p.X - a.X, 2) + Math.Pow(p.Y - a.Y, 2));
            double t = Math.Max(0, Math.Min(1, ((p.X - a.X) * (b.X - a.X) + (p.Y - a.Y) * (b.Y - a.Y)) / l2));
            double projX = a.X + t * (b.X - a.X);
            double projY = a.Y + t * (b.Y - a.Y);
            return Math.Sqrt(Math.Pow(p.X - projX, 2) + Math.Pow(p.Y - projY, 2));
        }

        private static string CleanCadText(string val)
        {
            if (string.IsNullOrEmpty(val)) return "";
            string s = val;
            s = Regex.Replace(s, @"\\P", " ");
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
            if (u.Contains("NOTE") || u.Contains("SPEC") || u.Contains("REF") || u.Contains("SEE") || u.Contains("TYP") || u.Contains(":")) return false;
            if (u.Contains("DOWNLIGHT") || u.Contains("SPOT") || u.Contains("LINEAR") || u.Contains("FITTING") || u.Contains("LAMP")) return false;
            return val.Length >= 1 && val.Length <= 10;
        }

        private static bool IsValidRoomLabel(string val)
        {
            if (string.IsNullOrWhiteSpace(val)) return false;
            string u = val.ToUpperInvariant();
            if (u.Contains("PLAN") || u.Contains("DRAWING") || u.Contains("DATE") || u.Contains("SCALE") || u.Contains("REV") || u.Contains("DETAIL")) return false;
            if (u.Contains("2024") || u.Contains("2025") || u.Contains("2026") || u.Contains("PROJECT") || u.Contains("ARCHITECT") || u.Contains("COPYRIGHT") || u.Contains("DWG")) return false;
            if (u.Contains("LEGEND") || u.Contains("NOTES") || u.Contains("NOTE") || u.Contains("GENERAL") || u.Contains("ARRANGEMENT")) return false;
            if (u.Contains("@") || u.Contains("=") || u.Contains("1:") || u.Contains("MM") || u.Contains("SPEC")) return false;
            return val.Length >= 2 && val.Length <= 45;
        }

        private static bool IsLinearLedTag(string val)
        {
            if (string.IsNullOrWhiteSpace(val)) return false;
            string u = val.ToUpperInvariant().Trim();

            // Point fixture tags that must NEVER be assigned to linear LED runs
            if (Regex.IsMatch(u, @"^LF[_\-0-9]")) return false; // Light Fitting: LF_01, LF_02, LF_03, etc.
            if (Regex.IsMatch(u, @"^[A-Z][0-9]{1,2}$")) return false; // A1, A2, A3, B1, P1, etc.
            if (u == "DP" || u == "WV" || u == "A" || u == "B" || u == "C" || u == "D")
                return false;

            if (u.StartsWith("L-") || u.StartsWith("LED-") || u.StartsWith("STRIP-") || u.StartsWith("LC_"))
                return true;
            if (u.Contains("LED") || u.Contains("STRIP") || u.Contains("COVE") || u.Contains("NEON") || u.Contains("PROFILE") || u.Contains("TAPE") || u.Contains("FLEX"))
                return true;

            return false;
        }

        private static bool IsRoomTextCandidate(string val, string layer)
        {
            if (string.IsNullOrWhiteSpace(val) || val.Length < 2 || val.Length > 60) return false;
            string u = val.ToUpperInvariant().Trim();
            string l = layer.ToUpperInvariant();

            // Ignore electrical, luminaire, dimension, and hatch layers
            if (l.Contains("LUM") || l.Contains("LIGHT") || l.Contains("LTG") || l.Contains("CIRC") || l.Contains("DIM") || l.Contains("HATCH"))
                return false;

            if (Regex.IsMatch(u, @"^[0-9\.,\s\:\-]+$")) return false;

            var words = Regex.Split(u, @"[\s\-_/,\.]+").Where(w => !string.IsNullOrWhiteSpace(w)).ToList();
            if (words.Any(w => NonRoomExcludes.Contains(w))) return false;

            if (u.Contains("SCALE") || u.Contains("REV") || u.Contains("DATE") || u.Contains("PROJECT") ||
                u.Contains("DRAWING") || u.Contains("SHEET") || u.Contains("DWG") || u.Contains("ARCHITECT") ||
                u.Contains("LEGEND") || u.Contains("NOTES") || u.Contains("NOTE") || u.Contains("GENERAL") ||
                u.Contains("ARRANGEMENT") || u.Contains("1:") || u.Contains("MM") || u.Contains("SPEC") ||
                u.Contains("%%") || u.Contains("DETAIL") || u.Contains("SECTION") || u.Contains("ELEVATION"))
                return false;

            if (l.Contains("ROOM") || l.Contains("ZONE") || l.Contains("SPACE") || l.Contains("A-LABEL") || l.Contains("SEATING") || (l.Contains("AREA") && !l.Contains("PEN")))
                return true;

            return words.Any(w => RoomKeywords.Contains(w));
        }

        private static List<TextLabel> MergeStackedRoomTexts(List<TextLabel> items)
        {
            var result = new List<TextLabel>();
            var used = new HashSet<TextLabel>();
            var sorted = items.OrderByDescending(i => i.Pt.Y).ToList();

            for (int i = 0; i < sorted.Count; i++)
            {
                var top = sorted[i];
                if (used.Contains(top)) continue;

                var bottom = sorted
                    .Where(b => !used.Contains(b) && b != top)
                    .Where(b => Math.Abs(b.Pt.X - top.Pt.X) <= 1200.0)
                    .Where(b => (top.Pt.Y - b.Pt.Y) >= 80.0 && (top.Pt.Y - b.Pt.Y) <= 450.0)
                    .OrderBy(b => top.Pt.Y - b.Pt.Y)
                    .FirstOrDefault();

                if (bottom != null)
                {
                    used.Add(top);
                    used.Add(bottom);
                    string cleanTop = Regex.Replace(top.Val, @"\s*BY DESIGNER.*$", "", RegexOptions.IgnoreCase).Trim().TrimEnd('/');
                    string cleanBottom = Regex.Replace(bottom.Val, @"\s*BY DESIGNER.*$", "", RegexOptions.IgnoreCase).Trim().TrimEnd('/');
                    string combined;
                    if (string.Equals(cleanTop, cleanBottom, StringComparison.OrdinalIgnoreCase))
                    {
                        combined = cleanTop;
                    }
                    else if (cleanTop.Contains(cleanBottom, StringComparison.OrdinalIgnoreCase))
                    {
                        combined = cleanTop;
                    }
                    else if (cleanBottom.Contains(cleanTop, StringComparison.OrdinalIgnoreCase))
                    {
                        combined = cleanBottom;
                    }
                    else
                    {
                        combined = $"{cleanTop} {cleanBottom}".Trim();
                    }

                    if (combined.Equals("OFFICE STORE", StringComparison.OrdinalIgnoreCase)) combined = "OFFICE / STORE";

                    result.Add(new TextLabel
                    {
                        Layer = top.Layer,
                        Val = combined,
                        Pt = new XYZ((top.Pt.X + bottom.Pt.X) / 2.0, (top.Pt.Y + bottom.Pt.Y) / 2.0, top.Pt.Z)
                    });
                }
                else
                {
                    used.Add(top);
                    string clean = Regex.Replace(top.Val, @"\s*BY DESIGNER.*$", "", RegexOptions.IgnoreCase).Trim().TrimEnd('/');
                    if (clean.Equals("DISABLED", StringComparison.OrdinalIgnoreCase)) clean = "DISABLED TOILET";
                    result.Add(new TextLabel { Layer = top.Layer, Val = clean, Pt = top.Pt });
                }
            }

            return result;
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
            public string ItemType { get; set; } = "fixture";

            [JsonPropertyName("qty")]
            public double Qty { get; set; } = 1;

            [JsonPropertyName("unit")]
            public string Unit { get; set; } = "pcs";

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
