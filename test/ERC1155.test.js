const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const { expect } = require('chai');

const { shouldBehaveLikeERC1155 } = require('./ERC1155.behavior');
const LempiverseChildMintableERC1155 = artifacts.require('LempiverseChildMintableERC1155');

contract('ERC1155', function (accounts) {
  const [operator, tokenHolder, tokenBatchHolder, ...otherAccounts] = accounts;

  beforeEach(async function () {
    this.token = await LempiverseChildMintableERC1155.new('0x0000000000000000000000000000000000000000');
  });

  shouldBehaveLikeERC1155([operator, ...otherAccounts]);

  describe('internal functions', function () {
    const tokenId = new BN(1990);
    const mintAmount = new BN(9001);
    const burnAmount = new BN(3000);

    const tokenBatchIds = [new BN(2000), new BN(2010), new BN(2020)];
    const mintAmounts = [new BN(5000), new BN(10000), new BN(42195)];
    const burnAmounts = [new BN(5000), new BN(9001), new BN(195)];

    const data = '0x12345678';

    describe('_mint', function () {
      it('reverts with a zero destination address', async function () {
        await expectRevert(
          this.token.mint(ZERO_ADDRESS, tokenId, mintAmount, data),
          'ERC1155: mint to the zero address',
        );
      });

      context('with minted tokens', function () {
        beforeEach(async function () {
          (this.receipt = await this.token.mint(tokenHolder, tokenId, mintAmount, data, { from: operator }));
        });

        it('emits a TransferSingle event', function () {
          expectEvent(this.receipt, 'TransferSingle', {
            operator,
            from: ZERO_ADDRESS,
            to: tokenHolder,
            id: tokenId,
            value: mintAmount,
          });
        });

        it('credits the minted amount of tokens', async function () {
          expect(await this.token.balanceOf(tokenHolder, tokenId)).to.be.bignumber.equal(mintAmount);
        });
      });
    });

    describe('_mintBatch', function () {
      it('reverts with a zero destination address', async function () {
        await expectRevert(
          this.token.mintBatch(ZERO_ADDRESS, tokenBatchIds, mintAmounts, data),
          'ERC1155: mint to the zero address',
        );
      });

      it('reverts if length of inputs do not match', async function () {
        await expectRevert(
          this.token.mintBatch(tokenBatchHolder, tokenBatchIds, mintAmounts.slice(1), data),
          'ERC1155: ids and amounts length mismatch',
        );

        await expectRevert(
          this.token.mintBatch(tokenBatchHolder, tokenBatchIds.slice(1), mintAmounts, data),
          'ERC1155: ids and amounts length mismatch',
        );
      });

      context('with minted batch of tokens', function () {
        beforeEach(async function () {
          (this.receipt = await this.token.mintBatch(
            tokenBatchHolder,
            tokenBatchIds,
            mintAmounts,
            data,
            { from: operator },
          ));
        });

        it('emits a TransferBatch event', function () {
          expectEvent(this.receipt, 'TransferBatch', {
            operator,
            from: ZERO_ADDRESS,
            to: tokenBatchHolder,
          });
        });

        it('credits the minted batch of tokens', async function () {
          const holderBatchBalances = await this.token.balanceOfBatch(
            new Array(tokenBatchIds.length).fill(tokenBatchHolder),
            tokenBatchIds,
          );

          for (let i = 0; i < holderBatchBalances.length; i++) {
            expect(holderBatchBalances[i]).to.be.bignumber.equal(mintAmounts[i]);
          }
        });
      });
    });
  });

  describe('ERC1155MetadataURI', function () {
    const firstTokenID = new BN('42');
    const secondTokenID = new BN('1337');

    const baseURI = 'https://token-cdn-domain/';

    beforeEach(async function () {

      (this.receipt = await this.token.setBaseURI(baseURI, { from: operator }));
      (this.receipt = await this.token.setURI(firstTokenID, firstTokenID.toString(), { from: operator }));
      (this.receipt = await this.token.setURI(secondTokenID, secondTokenID.toString(), { from: operator }));
    });


    it('emits no URI event in constructor', async function () {
      await expectEvent.notEmitted.inConstruction(this.token, 'URI');
    });

    it('sets the initial URI for all token types', async function () {
      expect(await this.token.uri(firstTokenID)).to.be.equal(baseURI+firstTokenID);
      expect(await this.token.uri(secondTokenID)).to.be.equal(baseURI+secondTokenID);
    });

    describe('_setURI', function () {
      const newURI = 'xxx';
      const newBaseURI = 'https://token-cdn-domain-new/';

      it('emits URI event', async function () {
        const receipt = await this.token.setURI(firstTokenID, newURI);

        expectEvent(receipt, 'URI', {
          value: baseURI+newURI,
          id: firstTokenID,
        });
      });

      it('sets the new URI for all token types', async function () {
        await this.token.setURI(firstTokenID, newURI);
        await this.token.setURI(secondTokenID, newURI);

        expect(await this.token.uri(firstTokenID)).to.be.equal(baseURI+newURI);
        expect(await this.token.uri(secondTokenID)).to.be.equal(baseURI+newURI);
      });

      it('sets the new base URI', async function () {
        await this.token.setBaseURI(newBaseURI);

        expect(await this.token.uri(firstTokenID)).to.be.equal(newBaseURI+firstTokenID);
        expect(await this.token.uri(secondTokenID)).to.be.equal(newBaseURI+secondTokenID);
      });
    });
  });
});
