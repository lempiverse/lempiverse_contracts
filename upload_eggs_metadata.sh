
doit() {
	curl -H "Authorization: Bearer $NFT_STORAGE_KEY" --request POST -F image=@$1.png -F "meta=<$1.meta.json;type=application/json" https://api.nft.storage/store
}

doit "EggUltra"
doit "EggMega"