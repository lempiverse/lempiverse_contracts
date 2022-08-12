const ethSigUtil = require('eth-sig-util');

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

async function domainSeparator (name, version, verifyingContract, salt) {
  // console.log("domainSeparator call", name, version, verifyingContract, salt);
  return '0x' + ethSigUtil.TypedDataUtils.hashStruct(
    'EIP712Domain',
    { name, version, verifyingContract, salt },
    { EIP712Domain },
  ).toString('hex');
}

module.exports = {
  EIP712Domain,
  Permit,
  domainSeparator,
};
