/**
 * Extra ~300 cities to bring the total to 1000+.
 * Format: [name, stateId, county, population, lat, lng, nearOcean?, nearMountains?, nearLake?]
 */
type CityTuple = [string, string, string, number, number, number, boolean?, boolean?, boolean?];

export const CITIES_EXTRA: CityTuple[] = [
	// More CA (smaller cities + notable)
	["Torrance", "CA", "Los Angeles", 147067, 33.8358, -118.3406, true, false, false],
	["Pomona", "CA", "Los Angeles", 151348, 34.0551, -117.7500, false, false, false],
	["Sunnyvale", "CA", "Santa Clara", 155805, 37.3688, -122.0363, false, false, false],
	["Salinas", "CA", "Monterey", 163542, 36.6777, -121.6555, false, false, false],
	["Thousand Oaks", "CA", "Ventura", 128731, 34.1706, -118.8376, false, true, false],
	["Visalia", "CA", "Tulare", 141384, 36.3302, -119.2921, false, true, false],
	["Concord", "CA", "Contra Costa", 129295, 37.9780, -122.0311, false, false, false],
	["Vallejo", "CA", "Solano", 124760, 38.1041, -122.2566, true, false, false],
	["El Monte", "CA", "Los Angeles", 107694, 34.0686, -118.0276, false, false, false],
	["Petaluma", "CA", "Sonoma", 60052, 38.2324, -122.6367, false, false, false],
	["San Rafael", "CA", "Marin", 59387, 37.9735, -122.5311, true, false, false],
	["Hemet", "CA", "Riverside", 89833, 33.7475, -116.9719, false, true, false],
	["Lake Forest", "CA", "Orange", 87390, 33.6469, -117.6892, false, false, false],
	["Norwalk", "CA", "Los Angeles", 100600, 33.9022, -118.0817, false, false, false],
	["Inglewood", "CA", "Los Angeles", 109084, 33.9617, -118.3531, true, false, false],
	["Santa Monica", "CA", "Los Angeles", 91577, 34.0195, -118.4912, true, false, false],
	["Menifee", "CA", "Riverside", 102527, 33.6913, -117.1850, false, false, false],
	["Clovis", "CA", "Fresno", 120124, 36.8252, -119.7029, false, true, false],
	["Sparks", "NV", "Washoe", 105006, 39.5349, -119.7527, false, true, false],
	["Rialto", "CA", "San Bernardino", 104026, 34.1064, -117.3703, false, true, false],

	// More TX
	["Lewisville", "TX", "Denton", 112000, 33.0462, -96.9942, false, false, false],
	["Abilene", "TX", "Taylor", 124695, 32.4487, -99.7331, false, false, false],
	["Wichita Falls", "TX", "Wichita", 102966, 33.9137, -98.4934, false, false, false],
	["College Station", "TX", "Brazos", 120511, 30.6280, -96.3344, false, false, false],
	["Bryan", "TX", "Brazos", 86260, 30.6744, -96.3698, false, false, false],
	["Longview", "TX", "Gregg", 83285, 32.5007, -94.7405, false, false, false],
	["Conroe", "TX", "Montgomery", 99301, 30.3119, -95.4560, false, false, false],
	["New Braunfels", "TX", "Comal", 90403, 29.7030, -98.1245, false, false, false],
	["Harlingen", "TX", "Cameron", 65665, 26.1906, -97.6961, false, false, false],
	["Temple", "TX", "Bell", 82073, 31.0982, -97.3428, false, false, false],
	["Mission", "TX", "Hidalgo", 84389, 26.2159, -98.3251, false, false, false],
	["Sugar Land", "TX", "Fort Bend", 118488, 29.6197, -95.6349, false, false, false],
	["Tyler", "TX", "Smith", 105984, 32.3513, -95.3011, false, false, false],
	["Beaumont", "TX", "Jefferson", 113090, 30.0802, -94.1266, false, false, false],
	["Allen", "TX", "Collin", 103420, 33.1031, -96.6706, false, false, false],
	["San Angelo", "TX", "Tom Green", 100680, 31.4638, -100.4370, false, false, false],
	["Odessa", "TX", "Ector", 122687, 31.8457, -102.3676, false, false, false],
	["Round Rock", "TX", "Williamson", 133372, 30.5083, -97.6789, false, false, false],
	["Richardson", "TX", "Dallas", 120981, 32.9483, -96.7299, false, false, false],
	["Edinburg", "TX", "Hidalgo", 101170, 26.3017, -98.1633, false, false, false],

	// More FL
	["Boynton Beach", "FL", "Palm Beach", 78679, 26.5317, -80.0906, true, false, false],
	["Largo", "FL", "Pinellas", 84046, 27.9095, -82.7873, true, false, false],
	["Brandon", "FL", "Hillsborough", 116549, 27.9378, -82.2859, false, false, false],
	["St. Cloud", "FL", "Osceola", 59734, 28.2489, -81.2812, false, false, true],
	["Sanford", "FL", "Seminole", 61741, 28.8028, -81.2731, false, false, true],
	["Port Charlotte", "FL", "Charlotte", 60205, 26.9762, -82.0906, true, false, false],
	["Fort Pierce", "FL", "St. Lucie", 45813, 27.4467, -80.3256, true, false, false],
	["Plantation", "FL", "Broward", 93900, 26.1276, -80.2331, false, false, false],
	["Sunrise", "FL", "Broward", 95387, 26.1669, -80.2561, false, false, false],
	["Naples", "FL", "Collier", 22635, 26.1420, -81.7948, true, false, false],
	["Ocala", "FL", "Marion", 63591, 29.1872, -82.1401, false, false, false],
	["Kissimmee", "FL", "Osceola", 74595, 28.2920, -81.4079, false, false, true],
	["Daytona Beach", "FL", "Volusia", 69975, 29.2108, -81.0228, true, false, false],
	["Pensacola", "FL", "Escambia", 54312, 30.4213, -87.2169, true, false, false],
	["Panama City", "FL", "Bay", 36877, 30.1588, -85.6602, true, false, false],

	// More GA
	["Valdosta", "GA", "Lowndes", 57013, 30.8327, -83.2785, false, false, false],
	["Smyrna", "GA", "Cobb", 56509, 33.8840, -84.5144, false, false, false],
	["Marietta", "GA", "Cobb", 60972, 33.9526, -84.5499, false, true, false],
	["Peachtree Corners", "GA", "Gwinnett", 44000, 33.9698, -84.2221, false, false, false],
	["Gainesville", "GA", "Hall", 42062, 34.2979, -83.8241, false, true, false],
	["Peachtree City", "GA", "Fayette", 35832, 33.3967, -84.5960, false, false, false],
	["Kennesaw", "GA", "Cobb", 34215, 34.0234, -84.6155, false, false, false],
	["Warner Robins", "GA", "Houston", 80308, 32.6130, -83.5996, false, false, false],
	["Woodstock", "GA", "Cherokee", 36049, 34.1015, -84.5194, false, true, false],

	// More NC
	["Apex", "NC", "Wake", 60111, 35.7323, -78.8503, false, false, false],
	["Kannapolis", "NC", "Cabarrus", 52687, 35.4874, -80.6217, false, false, false],
	["Indian Trail", "NC", "Union", 43060, 35.0768, -80.6440, false, false, false],
	["Wake Forest", "NC", "Wake", 48000, 35.9799, -78.5097, false, false, false],
	["Mooresville", "NC", "Iredell", 47879, 35.5843, -80.8098, false, false, true],
	["Huntersville", "NC", "Mecklenburg", 63299, 35.4107, -80.8429, false, false, false],
	["Cary", "NC", "Wake", 174721, 35.7915, -78.7811, false, false, false],
	["Holly Springs", "NC", "Wake", 46441, 35.6520, -78.8341, false, false, false],
	["Fuquay-Varina", "NC", "Wake", 38448, 35.5843, -78.7997, false, false, false],
	["Morrisville", "NC", "Wake", 29764, 35.8251, -78.8258, false, false, false],

	// More OH
	["Cuyahoga Falls", "OH", "Summit", 49652, 41.1334, -81.4846, false, false, false],
	["Dublin", "OH", "Franklin", 50789, 40.0992, -83.1141, false, false, false],
	["Middletown", "OH", "Butler", 51605, 39.5151, -84.3983, false, false, false],
	["Beavercreek", "OH", "Greene", 47669, 39.7137, -84.0633, false, false, false],
	["Strongsville", "OH", "Cuyahoga", 45648, 41.3145, -81.8357, false, false, false],
	["Hilliard", "OH", "Franklin", 37023, 40.0337, -83.1579, false, false, false],
	["Grove City", "OH", "Franklin", 40285, 39.8820, -83.0929, false, false, false],
	["Newark", "OH", "Licking", 50049, 40.0581, -82.4013, false, false, false],
	["Gahanna", "OH", "Franklin", 36549, 40.0181, -82.8724, false, false, false],
	["Westerville", "OH", "Franklin", 41217, 40.1262, -82.9291, false, false, false],

	// More MI
	["Rochester Hills", "MI", "Oakland", 74219, 42.6584, -83.1499, false, false, false],
	["Novi", "MI", "Oakland", 64030, 42.4806, -83.4755, false, false, false],
	["Taylor", "MI", "Wayne", 60925, 42.2409, -83.2697, false, false, false],
	["Pontiac", "MI", "Oakland", 59515, 42.6389, -83.2910, false, false, false],
	["Portage", "MI", "Kalamazoo", 50084, 42.2012, -85.5800, false, false, false],
	["Farmington Hills", "MI", "Oakland", 83986, 42.4989, -83.3677, false, false, false],
	["Southfield", "MI", "Oakland", 73006, 42.4734, -83.2219, false, false, false],
	["Battle Creek", "MI", "Calhoun", 51710, 42.3212, -85.1797, false, false, false],
	["Wyoming", "MI", "Kent", 78622, 42.9134, -85.7053, false, false, false],
	["Midland", "MI", "Midland", 41453, 43.6156, -84.2472, false, false, false],

	// More WA
	["Spokane Valley", "WA", "Spokane", 103500, 47.6732, -117.2394, false, true, false],
	["Federal Way", "WA", "King", 97701, 47.3223, -122.3126, false, true, false],
	["Kent", "WA", "King", 136588, 47.3809, -122.2348, false, true, false],
	["Redmond", "WA", "King", 69625, 47.6740, -122.1215, false, true, true],
	["Shoreline", "WA", "King", 55490, 47.7554, -122.3413, false, false, true],
	["Marysville", "WA", "Snohomish", 68400, 48.0515, -122.1771, false, true, false],
	["Sammamish", "WA", "King", 69788, 47.6163, -122.0356, false, true, true],
	["Lacey", "WA", "Thurston", 62697, 47.0343, -122.8232, true, true, false],
	["Auburn", "WA", "King", 87256, 47.3073, -122.2285, false, true, false],
	["Kennewick", "WA", "Benton", 84347, 46.2113, -119.1372, false, false, false],

	// More CO
	["Parker", "CO", "Douglas", 65885, 39.5186, -104.7613, false, true, false],
	["Longmont", "CO", "Boulder", 95144, 40.1672, -105.1019, false, true, false],
	["Erie", "CO", "Weld", 28872, 40.0025, -105.0469, false, true, false],
	["Castle Rock", "CO", "Douglas", 75415, 39.3722, -104.8561, false, true, false],
	["Windsor", "CO", "Weld", 26408, 40.4775, -104.9008, false, false, false],
	["Johnstown", "CO", "Weld", 23264, 40.3369, -104.9119, false, false, false],
	["Firestone", "CO", "Weld", 18447, 40.1555, -104.9427, false, false, false],
	["Commerce City", "CO", "Adams", 59617, 39.8083, -104.9339, false, false, false],
	["Englewood", "CO", "Arapahoe", 34572, 39.6486, -104.9878, false, true, false],
	["Littleton", "CO", "Arapahoe", 47837, 39.6136, -105.0166, false, true, false],

	// More MN
	["Coon Rapids", "MN", "Anoka", 63505, 45.1197, -93.3077, false, false, false],
	["Apple Valley", "MN", "Dakota", 54400, 44.7319, -93.2175, false, false, false],
	["Burnsville", "MN", "Dakota", 63843, 44.7677, -93.2777, false, false, false],
	["Eden Prairie", "MN", "Hennepin", 64061, 44.8547, -93.4708, false, false, false],
	["Edina", "MN", "Hennepin", 53494, 44.8897, -93.3499, false, false, false],
	["Maple Grove", "MN", "Hennepin", 73954, 45.0727, -93.4558, false, false, false],
	["Blaine", "MN", "Anoka", 70222, 45.1608, -93.2350, false, false, false],
	["Minnetonka", "MN", "Hennepin", 53781, 44.9211, -93.4687, false, false, true],
	["Lakeville", "MN", "Dakota", 69490, 44.6497, -93.2427, false, false, false],
	["Shakopee", "MN", "Scott", 43459, 44.7974, -93.5269, false, false, false],

	// More AZ
	["San Tan Valley", "AZ", "Pinal", 102440, 33.1978, -111.5262, false, false, false],
	["Buckeye", "AZ", "Maricopa", 91502, 33.3703, -112.5838, false, false, false],
	["Queen Creek", "AZ", "Maricopa", 63442, 33.2481, -111.6341, false, false, false],
	["Maricopa", "AZ", "Pinal", 54069, 33.0581, -112.0476, false, false, false],
	["Casa Grande", "AZ", "Pinal", 59400, 32.8795, -111.7574, false, false, false],
	["El Mirage", "AZ", "Maricopa", 36593, 33.6128, -112.3248, false, false, false],
	["Apache Junction", "AZ", "Pinal", 42926, 33.4151, -111.5495, false, true, false],
	["Prescott Valley", "AZ", "Yavapai", 48283, 34.6100, -112.3151, false, true, false],
	["Marana", "AZ", "Pima", 52975, 32.4361, -111.2232, false, true, false],
	["Kingman", "AZ", "Mohave", 33290, 35.1895, -114.0530, false, true, false],

	// More OR
	["Lake Oswego", "OR", "Clackamas", 40176, 45.4129, -122.7007, false, false, true],
	["Tigard", "OR", "Washington", 55767, 45.4312, -122.7715, false, false, false],
	["Redmond", "OR", "Deschutes", 33274, 44.2726, -121.1490, false, true, false],
	["Tualatin", "OR", "Washington", 28256, 45.3840, -122.7640, false, false, false],
	["Lake Oswego", "OR", "Clackamas", 40176, 45.4129, -122.7007, false, false, true],
	["Albany", "OR", "Linn", 56726, 44.6365, -123.1059, false, false, false],
	["McMinnville", "OR", "Yamhill", 34474, 45.2101, -123.1987, false, false, false],
	["Grants Pass", "OR", "Josephine", 40020, 42.4390, -123.3284, false, true, false],
	["Klamath Falls", "OR", "Klamath", 22054, 42.2249, -121.7817, false, true, true],

	// More WI
	["Waukesha", "WI", "Waukesha", 72419, 43.0117, -88.2315, false, false, false],
	["Brookfield", "WI", "Waukesha", 41464, 43.0606, -88.1065, false, false, false],
	["Greenfield", "WI", "Milwaukee", 37127, 42.9617, -88.0121, false, false, false],
	["Menomonee Falls", "WI", "Waukesha", 37930, 43.1786, -88.1193, false, false, false],
	["West Bend", "WI", "Washington", 32315, 43.4253, -88.1837, false, false, false],
	["New Berlin", "WI", "Waukesha", 40264, 42.9761, -88.1124, false, false, false],
	["Wauwatosa", "WI", "Milwaukee", 48267, 43.0497, -88.0079, false, false, false],
	["Mequon", "WI", "Ozaukee", 24659, 43.2317, -87.9834, false, false, true],
	["Pewaukee", "WI", "Waukesha", 14827, 43.0806, -88.2626, false, false, true],
	["Sun Prairie", "WI", "Dane", 37023, 43.1836, -89.2137, false, false, false],
	["Fitchburg", "WI", "Dane", 32423, 42.9942, -89.4399, false, false, false],
	["Middleton", "WI", "Dane", 22138, 43.0988, -89.5040, false, false, false],

	// More IL
	["Bolingbrook", "IL", "Will", 73366, 41.6986, -88.0684, false, false, false],
	["Palatine", "IL", "Cook", 68038, 42.1103, -88.0340, false, false, false],
	["Arlington Heights", "IL", "Cook", 75101, 42.0884, -87.9806, false, false, false],
	["Joliet", "IL", "Will", 150362, 41.5250, -88.0817, false, false, false],
	["Elgin", "IL", "Kane", 114797, 42.0354, -88.2826, false, false, false],
	["Evanston", "IL", "Cook", 74486, 42.0451, -87.6877, false, false, true],
	["Waukegan", "IL", "Lake", 87938, 42.3636, -87.8448, false, false, true],
	["Downers Grove", "IL", "DuPage", 49691, 41.8081, -88.0112, false, false, false],
	["Tinley Park", "IL", "Cook", 56703, 41.5733, -87.7873, false, false, false],
	["Orland Park", "IL", "Cook", 59103, 41.6300, -87.8539, false, false, false],
	["Cicero", "IL", "Cook", 85268, 41.8456, -87.7540, false, false, false],
	["Oak Lawn", "IL", "Cook", 56699, 41.7136, -87.7478, false, false, false],

	// More IN
	["Greenwood", "IN", "Johnson", 65636, 39.6136, -86.1066, false, false, false],
	["Noblesville", "IN", "Hamilton", 72742, 40.0456, -86.0086, false, false, false],
	["Westfield", "IN", "Hamilton", 47077, 40.0428, -86.1278, false, false, false],
	["Zionsville", "IN", "Boone", 29462, 39.9528, -86.2661, false, false, false],
	["Kokomo", "IN", "Howard", 57755, 40.4864, -86.1336, false, false, false],
	["Terre Haute", "IN", "Vigo", 56528, 39.4667, -87.4139, false, false, false],
	["Anderson", "IN", "Madison", 55155, 40.1053, -85.6802, false, false, false],
	["Mishawaka", "IN", "St. Joseph", 50389, 41.6620, -86.1581, false, false, false],
	["Columbus", "IN", "Bartholomew", 50614, 39.2014, -85.9214, false, false, false],

	// More TN additional
	["Columbia", "TN", "Maury", 42312, 35.6151, -87.0353, false, false, false],
	["Spring Hill", "TN", "Williamson", 53295, 35.7518, -86.9300, false, false, false],
	["Smyrna", "TN", "Rutherford", 56456, 35.9829, -86.5186, false, false, false],
	["La Vergne", "TN", "Rutherford", 41055, 36.0165, -86.5811, false, false, false],
	["Lebanon", "TN", "Wilson", 37198, 36.2081, -86.2911, false, false, false],
	["Cookeville", "TN", "Putnam", 35787, 36.1628, -85.5016, false, true, false],
	["Maryville", "TN", "Blount", 31907, 35.7567, -84.0160, false, true, false],

	// More VA
	["Leesburg", "VA", "Loudoun", 59565, 39.1154, -77.5636, false, false, false],
	["Blacksburg", "VA", "Montgomery", 44798, 37.2296, -80.4139, false, true, false],
	["Staunton", "VA", "Staunton City", 25746, 38.1496, -79.0717, false, true, false],
	["Fredericksburg", "VA", "Fredericksburg City", 29049, 38.3032, -77.4605, false, false, false],
	["Waynesboro", "VA", "Waynesboro City", 23476, 38.0682, -78.8895, false, true, false],
	["Danville", "VA", "Danville City", 41948, 36.5860, -79.3950, false, false, false],

	// More MD
	["Waldorf", "MD", "Charles", 71879, 38.6318, -76.9144, false, false, false],
	["Germantown", "MD", "Montgomery", 90552, 39.1732, -77.2717, false, false, false],
	["Silver Spring", "MD", "Montgomery", 81015, 38.9907, -77.0261, false, false, false],
	["Ellicott City", "MD", "Howard", 72762, 39.2673, -76.7983, false, false, false],
	["Columbia", "MD", "Howard", 103467, 39.2037, -76.8610, false, false, false],
	["Bethesda", "MD", "Montgomery", 68056, 38.9807, -77.1007, false, false, false],
	["Towson", "MD", "Baltimore", 56992, 39.4015, -76.6019, false, false, false],
	["Dundalk", "MD", "Baltimore", 62320, 39.2701, -76.5285, true, false, false],
	["Bel Air", "MD", "Harford", 10080, 39.5351, -76.3488, false, false, false],

	// More MO
	["Chesterfield", "MO", "St. Louis", 49899, 38.6631, -90.5771, false, false, false],
	["Florissant", "MO", "St. Louis", 52158, 38.7889, -90.3224, false, false, false],
	["Ballwin", "MO", "St. Louis", 30199, 38.5953, -90.5460, false, false, false],
	["Wildwood", "MO", "St. Louis", 35517, 38.5903, -90.6612, false, false, false],
	["Kirkwood", "MO", "St. Louis", 27962, 38.5831, -90.4068, false, false, false],
	["Joplin", "MO", "Jasper", 52388, 37.0842, -94.5133, false, false, false],

	// More NJ
	["Union City", "NJ", "Hudson", 70387, 40.7698, -74.0246, true, false, false],
	["Bayonne", "NJ", "Hudson", 72197, 40.6687, -74.1143, true, false, false],
	["Vineland", "NJ", "Cumberland", 61173, 39.4857, -75.0258, false, false, false],
	["Princeton", "NJ", "Mercer", 30168, 40.3573, -74.6672, false, false, false],
	["Hoboken", "NJ", "Hudson", 60419, 40.7440, -74.0324, true, false, false],
	["North Brunswick", "NJ", "Middlesex", 43968, 40.4432, -74.4813, false, false, false],
	["Old Bridge", "NJ", "Middlesex", 65375, 40.4004, -74.3579, false, false, false],
	["Piscataway", "NJ", "Middlesex", 60000, 40.4990, -74.3976, false, false, false],
	["Sayreville", "NJ", "Middlesex", 49530, 40.4587, -74.3607, false, false, false],
	["Parsippany", "NJ", "Morris", 53533, 40.8573, -74.4265, false, false, false],

	// More PA
	["Lower Merion", "PA", "Montgomery", 59741, 40.0148, -75.2713, false, false, false],
	["Levittown", "PA", "Bucks", 51978, 40.1540, -74.8613, false, false, false],
	["Haverford", "PA", "Delaware", 51443, 39.9837, -75.3079, false, false, false],
	["Bensalem", "PA", "Bucks", 60427, 40.1004, -74.9512, false, false, false],
	["Upper Darby", "PA", "Delaware", 82795, 39.9617, -75.2660, false, false, false],
	["Norristown", "PA", "Montgomery", 35115, 40.1215, -75.3399, false, false, false],
	["Plum", "PA", "Allegheny", 27038, 40.5001, -79.7482, false, false, false],
	["Bethel Park", "PA", "Allegheny", 32313, 40.3286, -80.0368, false, false, false],
	["Monroeville", "PA", "Allegheny", 29169, 40.4217, -79.7618, false, false, false],
	["Harrisburg", "PA", "Dauphin", 50099, 40.2732, -76.8867, false, false, false],

	// More NY
	["Hempstead", "NY", "Nassau", 60000, 40.7062, -73.6187, true, false, false],
	["Valley Stream", "NY", "Nassau", 38254, 40.6643, -73.7079, true, false, false],
	["Levittown", "NY", "Nassau", 51881, 40.7257, -73.5135, true, false, false],
	["Ramapo", "NY", "Rockland", 131802, 41.1401, -74.1096, false, false, false],
	["Brookhaven", "NY", "Suffolk", 486040, 40.7793, -72.9170, true, false, false],
	["Islip", "NY", "Suffolk", 341534, 40.7298, -73.1885, true, false, false],
	["Babylon", "NY", "Suffolk", 219756, 40.6951, -73.3249, true, false, false],
	["Smithtown", "NY", "Suffolk", 119572, 40.8551, -73.1990, true, false, false],
	["Oyster Bay", "NY", "Nassau", 293925, 40.8548, -73.5329, true, false, false],
	["Poughkeepsie", "NY", "Dutchess", 32736, 41.7004, -73.9209, false, false, false],
	["Peekskill", "NY", "Westchester", 24191, 41.2948, -73.9196, false, false, false],
	["Middletown", "NY", "Orange", 28086, 41.4459, -74.4229, false, false, false],

	// More IA
	["West Des Moines", "IA", "Polk", 72963, 41.5774, -93.7113, false, false, false],
	["Ankeny", "IA", "Polk", 71152, 41.7286, -93.6037, false, false, false],
	["Cedar Falls", "IA", "Black Hawk", 40713, 42.5348, -92.4453, false, false, false],
	["Marion", "IA", "Linn", 42014, 42.0344, -91.5977, false, false, false],
	["Waukee", "IA", "Dallas", 24858, 41.6097, -93.8883, false, false, false],
	["Urbandale", "IA", "Polk", 45440, 41.6264, -93.7122, false, false, false],

	// More KS
	["Leawood", "KS", "Johnson", 35748, 38.9167, -94.6235, false, false, false],
	["Lenexa", "KS", "Johnson", 56366, 38.9528, -94.7340, false, false, false],
	["Overland Park", "KS", "Johnson", 197238, 38.9822, -94.6708, false, false, false],
	["Derby", "KS", "Sedgwick", 26132, 37.5503, -97.2692, false, false, false],
	["Hutchinson", "KS", "Reno", 40779, 38.0608, -97.9298, false, false, false],
	["Salina", "KS", "Saline", 46570, 38.8403, -97.6114, false, false, false],
	["Garden City", "KS", "Finney", 27666, 37.9717, -100.8726, false, false, false],

	// More NE
	["Papillion", "NE", "Sarpy", 24013, 41.1544, -96.0417, false, false, false],
	["La Vista", "NE", "Sarpy", 17150, 41.1866, -96.0311, false, false, false],
	["Ralston", "NE", "Douglas", 5943, 41.2000, -96.0358, false, false, false],
	["Norfolk", "NE", "Madison", 24210, 42.0280, -97.4170, false, false, false],
	["Columbus", "NE", "Platte", 24059, 41.4299, -97.3673, false, false, false],

	// More NV
	["Carson City", "NV", "Carson City", 58838, 39.1638, -119.7674, false, true, false],
	["Elko", "NV", "Elko", 20708, 40.8324, -115.7631, false, true, false],
	["Fernley", "NV", "Lyon", 22151, 39.6079, -119.2523, false, true, false],

	// More OK
	["Enid", "OK", "Garfield", 49379, 36.3956, -97.8784, false, false, false],
	["Stillwater", "OK", "Payne", 50299, 36.1156, -97.0584, false, false, false],
	["Moore", "OK", "Cleveland", 61387, 35.3395, -97.4867, false, false, false],
	["Mustang", "OK", "Canadian", 24764, 35.3845, -97.7245, false, false, false],
	["Owasso", "OK", "Tulsa", 41973, 36.2695, -95.8550, false, false, false],
	["Bixby", "OK", "Tulsa", 29849, 35.9420, -95.8836, false, false, false],
	["Shawnee", "OK", "Pottawatomie", 31206, 35.3273, -96.9253, false, false, false],

	// More AR
	["Texarkana", "AR", "Miller", 29919, 33.4418, -94.0377, false, false, false],
	["Pine Bluff", "AR", "Jefferson", 42033, 34.2284, -92.0032, false, false, false],
	["Russellville", "AR", "Pope", 29326, 35.2784, -93.1338, false, false, false],
	["Hot Springs", "AR", "Garland", 38178, 34.5037, -93.0552, false, true, false],
	["Searcy", "AR", "White", 24091, 35.2506, -91.7362, false, false, false],
	["Bella Vista", "AR", "Benton", 30299, 36.4809, -94.2713, false, false, false],

	// More NM
	["Alamogordo", "NM", "Otero", 31385, 32.8995, -105.9603, false, true, false],
	["Clovis", "NM", "Curry", 37775, 34.4048, -103.2052, false, false, false],
	["Las Cruces", "NM", "Doña Ana", 113811, 32.3199, -106.7637, false, true, false],
	["Carlsbad", "NM", "Eddy", 29613, 32.4207, -104.2288, false, false, false],
	["Hobbs", "NM", "Lea", 41313, 32.7026, -103.1360, false, false, false],
	["Gallup", "NM", "McKinley", 21678, 35.5281, -108.7426, false, true, false],

	// More WV
	["Clarksburg", "WV", "Harrison", 15712, 39.2809, -80.3423, false, true, false],
	["Beckley", "WV", "Raleigh", 16356, 37.7782, -81.1882, false, true, false],
	["Martinsburg", "WV", "Berkeley", 18236, 39.4562, -77.9644, false, true, false],

	// More MT
	["Kalispell", "MT", "Flathead", 26067, 48.1956, -114.3130, false, true, true],
	["Butte", "MT", "Silver Bow", 34494, 46.0038, -112.5348, false, true, false],
	["Havre", "MT", "Hill", 9762, 48.5500, -109.6836, false, false, false],

	// More WY
	["Rock Springs", "WY", "Sweetwater", 23561, 41.5875, -109.2029, false, true, false],
	["Jackson", "WY", "Teton", 10532, 43.4799, -110.7624, false, true, false],
	["Green River", "WY", "Sweetwater", 12515, 41.5272, -109.4660, false, true, false],

	// More HI
	["Kahului", "HI", "Maui", 26337, 20.8893, -156.4729, true, true, false],
	["Kihei", "HI", "Maui", 22474, 20.7645, -156.4442, true, true, false],
	["Kapolei", "HI", "Honolulu", 15186, 21.3353, -158.0745, true, false, false],

	// More AK
	["Ketchikan", "AK", "Ketchikan Gateway", 8192, 55.3422, -131.6461, true, true, false],
	["Kodiak", "AK", "Kodiak Island", 5655, 57.7900, -152.4072, true, true, false],
	["Homer", "AK", "Kenai Peninsula", 5706, 59.6425, -151.5483, true, true, false],

	// Notable / resort towns
	["Sedona", "AZ", "Yavapai", 10336, 34.8697, -111.7610, false, true, false],
	["Telluride", "CO", "San Miguel", 2558, 37.9375, -107.8123, false, true, false],
	["Vail", "CO", "Eagle", 5638, 39.6433, -106.3781, false, true, false],
	["Steamboat Springs", "CO", "Routt", 13078, 40.4850, -106.8317, false, true, false],
	["Key West", "FL", "Monroe", 24649, 24.5551, -81.7800, true, false, false],
	["Bar Harbor", "ME", "Hancock", 5089, 44.3876, -68.2042, true, false, false],
	["Park City", "UT", "Summit", 8403, 40.6461, -111.4980, false, true, false],
	["Whitefish", "MT", "Flathead", 8097, 48.4114, -114.3350, false, true, true],
	["Sun Valley", "ID", "Blaine", 1518, 43.6966, -114.3527, false, true, false],
	["Moab", "UT", "Grand", 5329, 38.5733, -109.5498, false, true, false],
	["Durango", "CO", "La Plata", 19878, 37.2753, -107.8801, false, true, false],
	["Aspen", "CO", "Pitkin", 7726, 39.1911, -106.8175, false, true, false],
	["Stowe", "VT", "Lamoille", 5094, 44.4654, -72.6873, false, true, false],
	["Montpelier", "VT", "Washington", 7832, 44.2601, -72.5754, false, true, false],
	["Cape May", "NJ", "Cape May", 2845, 38.9351, -74.9060, true, false, false],
	["Traverse City", "MI", "Grand Traverse", 15678, 44.7631, -85.6206, false, false, true],
	["Hilton Head Island", "SC", "Beaufort", 40054, 32.2163, -80.7526, true, false, false],
	["Gatlinburg", "TN", "Sevier", 4187, 35.7143, -83.5129, false, true, false],
	["Pigeon Forge", "TN", "Sevier", 6408, 35.7887, -83.5549, false, true, false],
	["Hendersonville", "NC", "Henderson", 15159, 35.3204, -82.4596, false, true, false],
];
