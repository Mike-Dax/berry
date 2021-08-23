import {PortablePath, xfs} from '@yarnpkg/fslib';
import {yarn}              from 'pkg-tests-core';

const {writeConfiguration} = yarn;

describe(`Variant tests`, () => {
  test(
    `it should install the fallback dependency when no matching pattern can be found`,
    makeTemporaryEnv(
      {
        dependencies: {[`variants`]: `1.0.0`},
      },
      async ({run, source}) => {
        await run(`install`);

        await expect(source(`require('variants')`)).resolves.toMatchObject({
          name: `variants-fallback`,
          version: `1.0.0`,
        });
      },
    ),
  );

  test(
    `it should correctly install a dependency matching parameters set in the dependenciesMeta`,
    makeTemporaryEnv(
      {
        dependencies: {[`variants`]: `1.0.0`},
        dependenciesMeta: {
          [`variants`]: {
            parameters: {
              par1: `a`,
              par2: 1,
            },
          },
        },
      },
      async ({run, source}) => {
        await run(`install`);

        await expect(source(`require('variants')`)).resolves.toMatchObject({
          name: `variants-a-1`,
          version: `1.0.0`,
        });
      },
    ),
  );

  test(
    `it should fetch the matrix of cached variants set in the yarnrc`,
    makeTemporaryEnv(
      {
        dependencies: {[`variants`]: `1.0.0`},
        dependenciesMeta: {
          [`variants`]: {
            parameters: {
              par1: `a`,
              par2: 1,
            },
          },
        },
      },
      async ({path, run}) => {
        await writeConfiguration(path, {
          cacheParameters: {
            matrix: {
              par1: [`a`, `b`, `c`],
              par2: [1],
            },
          },
        });

        await run(`install`);


        const cache = await xfs.readdirPromise(`${path}/.yarn/cache` as PortablePath);

        const variantA1 = cache.find(file => file.startsWith(`variants-a-1-npm-1.0.0`));
        const variantB1 = cache.find(file => file.startsWith(`variants-b-1-npm-1.0.0`));
        const variantC1 = cache.find(file => file.startsWith(`variants-c-1-npm-1.0.0`));

        expect(variantA1).toBeDefined();
        expect(variantB1).toBeDefined();
        expect(variantC1).not.toBeDefined(); // C1 is excluded by the variants package
      },
    ),
  );
});
