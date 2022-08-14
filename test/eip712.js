const ethSigUtil = require('eth-sig-util');
const { fromRpcSig } = require('ethereumjs-util');

const EIP712Domain = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'verifyingContract', type: 'address' },
  { name: 'salt', type: 'bytes32' },
];

const Permit = [
  { name: 'owner', type: 'address' },
  { name: 'spender', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'deadline', type: 'uint256' },
];

const VERSION="1";

async function domainSeparator (name, verifyingContract, salt) {
  // console.log("domainSeparator call", name, VERSION, verifyingContract, salt);
  return '0x' + ethSigUtil.TypedDataUtils.hashStruct(
    'EIP712Domain',
    { name, version:VERSION, verifyingContract, salt },
    { EIP712Domain },
  ).toString('hex');
}


function encodeIntAsByte32(digit) {
  var array = new Array(32).fill(0);
  var n = digit
  for (var i = 0; i<4; i++) {
      array[31-i] = n & 0xff
      n >>= 8
  }
  return array;
}


const buildData = (name, version, salt, verifyingContract, owner, spender, value, nonce, deadline) => ({
  primaryType: 'Permit',
  types: { EIP712Domain, Permit },
  domain: { name, version, verifyingContract, salt },
  message: { owner, spender, value, nonce, deadline },
});

async function calcPermitVRS (name, key, buyer, paymentToken, minter, value, nonce, chainId, deadline) {
  const data = buildData(name, VERSION, encodeIntAsByte32(chainId), paymentToken, buyer, minter, value, nonce, deadline);
  const signature = ethSigUtil.signTypedMessage(key, { data });
  return fromRpcSig(signature);
};


module.exports = {
  calcPermitVRS,
  encodeIntAsByte32,
  EIP712Domain,
  Permit,
  domainSeparator,
};
