import pandas as pd
import json


IMAGE_BASE_PATH = "ipfs://bafybeid644gc2u4wl54sa5p3kwb6flpk5zexqujdlfeda4x6tacdcrhwmu/"
VIDEO_BASE_PATH = "ipfs://bafybeie37t55hofvpj4y6ng5yaete2bvmtcoyivuxdug4tvh3kewi7fdie/"

table = pd.read_csv("Lempings-table.csv")

# clmns = ["idx", "name", "Rarity", "Element", "description", "Max energy", "Earning Bonus", "Total Power", "Egg After Breed", "Blockchain Id Full", "Blockchain Id Empty"]
clmns = ["name", "description"]
attribs = ["Rarity", "Element", "Max energy", "Earning Bonus", "Total Power", "Egg After Breed"]
withmaxval = ["Max energy", "Earning Bonus", "Total Power"]
display_types = {}
display_types["Earning Bonus"] = "boost_percentage"
display_types["Max energy"] = "number"
display_types["Total Power"] = "number"


def gen(r, empty):
	meta = {"external_url": "https://lempiverse.com/", "background_color": "ffffff"}
	meta["image"] = IMAGE_BASE_PATH + str(r["idx"]) + ("b.png" if empty else ".png")
	if r["idx"] >= 31 and r["idx"] <= 36:
		# meta["animation_url"] = VIDEO_BASE_PATH + str(r["idx"]) + ("b.mp4" if empty else ".mp4")
		meta["image"] = VIDEO_BASE_PATH + str(r["idx"]) + ("b.gif" if empty else ".gif")
	for c in clmns:
		meta[c] = r[c]

	aa = []
	aa.append({"trait_type":"Fullness","value":("No Energy" if empty else "Full Energy")})
	aa.append({"trait_type":"Lemping ID","value":str(r["idx"])})


	for c in attribs:
		o = {"trait_type":c}

		o["value"] = r[c]
		if c in withmaxval:
			o["max_value"] = r[c]

		if c == "Max energy":
			aa.append({"trait_type":"Energy", "value":(0 if empty else r[c]), "max_value" : r[c], "display_type":"number"})

		if display_types.get(c) is not None:
			o["display_type"] = display_types.get(c)
		aa.append(o)

	meta["attributes"] = aa

	ext = str(r["idx"]) + ("b.json" if empty else ".json")
	# print(meta)
	out_file = open("./pets-metadata/"+ext, "w")
	json.dump(meta, out_file, indent = 2)
	out_file.close()


for index, r in table.iterrows():
	gen(r, False)
	gen(r, True)


