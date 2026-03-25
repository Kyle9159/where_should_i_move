/**
 * Gap-fill cities — targeting underrepresented states to reach 1000+ total.
 * These are verified to NOT be in any previous data file.
 */
type CityTuple = [string, string, string, number, number, number];

export const CITIES_GAP: CityTuple[] = [
	// South Dakota (currently 4 → 10)
	["Watertown", "SD", "Codington", 24528, 44.8997, -97.1129],
	["Mitchell", "SD", "Davison", 15254, 43.7097, -98.0298],
	["Huron", "SD", "Beadle", 13394, 44.3630, -98.2148],
	["Yankton", "SD", "Yankton", 15155, 42.8711, -97.3975],
	["Vermillion", "SD", "Clay", 11765, 42.7791, -96.9292],
	["Spearfish", "SD", "Lawrence", 12193, 44.4908, -103.8591],

	// North Dakota (currently 4 → 8)
	["Jamestown", "ND", "Stutsman", 15666, 46.9105, -98.7082],
	["Mandan", "ND", "Morton", 24093, 46.8274, -100.8896],
	["Dickinson", "ND", "Stark", 26081, 46.8792, -102.7896],
	["Williston", "ND", "Williams", 27201, 48.1469, -103.6179],

	// Vermont (currently 5 → 7)
	["Rutland", "VT", "Rutland", 15807, 43.6106, -72.9726],
	["Barre", "VT", "Washington", 8748, 44.1970, -72.5020],

	// Maine (currently 8 → 11)
	["Biddeford", "ME", "York", 23324, 43.4926, -70.4534],
	["Augusta", "ME", "Kennebec", 19136, 44.3106, -69.7795],
	["Westbrook", "ME", "Cumberland", 19282, 43.6773, -70.3712],

	// New Hampshire (currently 8 → 11)
	["Derry", "NH", "Rockingham", 33109, 42.8807, -71.3273],
	["Londonderry", "NH", "Rockingham", 25101, 42.8651, -71.3739],
	["Merrimack", "NH", "Hillsborough", 26877, 42.8654, -71.4940],

	// Wyoming (currently 7 → 9)
	["Sheridan", "WY", "Sheridan", 17844, 44.7972, -106.9562],
	["Riverton", "WY", "Fremont", 10710, 43.0244, -108.3806],

	// Montana (currently 9 → 11)
	["Miles City", "MT", "Custer", 8396, 46.4083, -105.8406],
	["Livingston", "MT", "Park", 8040, 45.6616, -110.5599],

	// Alaska (currently 9 → 12)
	["Bethel", "AK", "Bethel", 6325, 60.7922, -161.7558],
	["Soldotna", "AK", "Kenai Peninsula", 5014, 60.4875, -151.0597],
	["Kenai", "AK", "Kenai Peninsula", 7869, 60.5544, -151.2583],

	// Delaware (currently 5 → 8)
	["Milford", "DE", "Sussex", 11360, 38.9126, -75.4274],
	["Seaford", "DE", "Sussex", 7895, 38.6407, -75.6113],
	["Smyrna", "DE", "Kent", 12000, 39.2993, -75.6049],

	// Rhode Island (currently 5 → 8)
	["Woonsocket", "RI", "Providence", 41186, 42.0029, -71.5148],
	["East Providence", "RI", "Providence", 47037, 41.8137, -71.3701],
	["North Providence", "RI", "Providence", 32786, 41.8601, -71.4334],

	// Iowa (currently 15 → 18)
	["Bettendorf", "IA", "Scott", 38008, 41.5245, -90.5174],
	["Mason City", "IA", "Cerro Gordo", 27076, 43.1536, -93.2010],
	["Marshalltown", "IA", "Marshall", 27552, 42.0494, -92.9079],

	// Kentucky (currently 10 → 12)
	["Henderson", "KY", "Henderson", 29281, 37.8362, -87.5900],
	["Hopkinsville", "KY", "Christian", 31337, 36.8656, -87.4886],

	// More unique additions
	["Sheboygan", "WI", "Sheboygan", 49288, 43.7508, -87.7145],
	["Fond du Lac", "WI", "Fond du Lac", 43021, 43.7730, -88.4471],
	["Racine", "WI", "Racine", 77816, 42.7261, -87.7828],
	["Kenosha", "WI", "Kenosha", 99769, 42.5847, -87.8212],
	["Oshkosh", "WI", "Winnebago", 66083, 44.0247, -88.5426],
	["Appleton", "WI", "Outagamie", 77086, 44.2619, -88.4154],
];
