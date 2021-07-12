import * as variantUtils from '../sources/variantUtils';

describe(`variantUtils`, () => {
  describe(`combineVariantMatrix`, () => {
    it(`should combine a simple matrix`, () => {
      expect(
        variantUtils.combineVariantMatrix({
          A: {
            candidates: [`1`, `2`],
          },
          B: {
            candidates: [`3`, `4`],
          },
        })
      ).toMatchObject([
        {A: `1`, B: `3`},
        {A: `1`, B: `4`},
        {A: `2`, B: `3`},
        {A: `2`, B: `4`},
      ]);
    });
    it(`should combine a simple matrix with exclusions`, () => {
      expect(
        variantUtils.combineVariantMatrix({
          A: {
            candidates: [`1`, `2`],
          },
          B: {
            candidates: [`3`, `4`],
          },
        }, [
          {
            A: `1`,
            B: `3`,
          },
        ])
      ).toMatchObject([
        {A: `1`, B: `4`},
        {A: `2`, B: `3`},
        {A: `2`, B: `4`},
      ]);
    });
  });

  describe(`matchVariantParameters`, () => {
    it(`should match parameters in the exact case`, () => {
      expect(
        variantUtils.matchVariantParameters([{
          A: `1`,
        }, {
          A: `2`,
        }, {
          A: `3`,
        }], {
          A: `1`,
        })
      ).toMatchObject(
        {A: `1`},
      );
    });
    it(`should match parameters with extraneous ones`, () => {
      expect(
        variantUtils.matchVariantParameters([{
          A: `1`,
        }, {
          A: `2`,
        }, {
          A: `3`,
        }], {
          A: `1`,
          B: `unused`,
          C: `unused`,
        })
      ).toMatchObject(
        {A: `1`}
      );
    });
    it(`should match parameters with custom comparators`, () => {
      expect(
        variantUtils.matchVariantParameters([{
          backwardsCompatibleParameter: `3`,
        }, {
          backwardsCompatibleParameter: `5`,
        }], {
          backwardsCompatibleParameter: `4`,
        }, {
          backwardsCompatibleParameter: (parameterValue, possiblityValue) => parseInt(parameterValue) >= parseInt(possiblityValue),
        })
      ).toMatchObject(
        {backwardsCompatibleParameter: `3`}
      );
    });
  });
});
