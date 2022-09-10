import * as dotenv from 'dotenv'
dotenv.config()
const NFT_STORAGE_KEY = process.env.NFT_STORAGE_KEY

console.log(NFT_STORAGE_KEY);

import { NFTStorage } from 'nft.storage'
import { filesFromPath } from 'files-from-path'
import path from 'path'


async function main() {
  // you'll probably want more sophisticated argument parsing in a real app
  if (process.argv.length !== 3) {
    console.error(`usage: ${process.argv[0]} ${process.argv[1]} <directory-path>`)
  }
  const directoryPath = process.argv[2]
  const files = filesFromPath(directoryPath, {
    pathPrefix: path.resolve(directoryPath), // see the note about pathPrefix below
    hidden: false, // use the default of false if you want to ignore files that start with '.'
  })

  // for await (const f of files) {
  //   console.log(f);
  // }

  const storage = new NFTStorage({ token:NFT_STORAGE_KEY })

  console.log(`storing file(s) from ${path}`)
  const cid = await storage.storeDirectory(files)
  console.log({ cid })

  const status = await storage.status(cid)
  console.log(status)
}
main()