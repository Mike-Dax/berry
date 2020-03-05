import {Fetcher, FetchOptions, MinimalFetchOptions} from '@yarnpkg/core';
import {ReportError, MessageName, Resolver, ResolveOptions, MinimalResolveOptions, Manifest, DescriptorHash, Package} from '@yarnpkg/core';
import {Descriptor, Locator}                                                                                          from '@yarnpkg/core';
import {LinkType}                                                                                                     from '@yarnpkg/core';
import {structUtils}                                                                                                  from '@yarnpkg/core';
import {ppath, xfs, ZipFS, Filename, CwdFS, PortablePath}         from '@yarnpkg/fslib';
import {getLibzipPromise}                           from '@yarnpkg/libzip';
import semver                                       from 'semver';

import * as utils                                   from './utils';
import {PrebuildCalculatedOptions}                  from './utils';

import { npmHttpUtils }                             from '@yarnpkg/plugin-npm';


export class PrebuildFetcher implements Fetcher {
  supports(locator: Locator, opts: MinimalFetchOptions) {
    if (!locator.reference.startsWith(`prebuild:`))
      return false;

    return true;
  }

  getLocalPath(locator: Locator, opts: FetchOptions) {
    return null;
  }

  async fetch(locator: Locator, opts: FetchOptions) {
    const expectedChecksum = null // opts.checksums.get(locator.locatorHash) || null;

    const [packageFs, releaseFs, checksum] = await opts.cache.fetchPackageFromCache(
      locator,
      expectedChecksum,
      async () => {
        opts.report.reportInfoOnce(MessageName.FETCH_NOT_CACHED, `${structUtils.prettyLocator(opts.project.configuration, locator)} can't be found in the cache and will be fetched from the registry`);
        return await this.fetchPrebuild(locator, opts);
      },
    );

    return {
      packageFs,
      releaseFs,
      prefixPath: structUtils.getIdentVendorPath(locator),
      localPath: this.getLocalPath(locator, opts),
      checksum,
    };
  }

  private async fetchPrebuild(locator: Locator, opts: FetchOptions) {
    const { packageIdent } = utils.parseSpec(locator.reference);

    const electronVersion = await utils.getElectronVersion(opts.project)
    const nativeModule = await utils.getNativeModule(opts.project, packageIdent, locator)

    if (nativeModule === null) {
      throw new ReportError(MessageName.UNNAMED, `Could not find the native module that had a prebuild attempt`);
    }

    opts.report.reportInfo(MessageName.UNNAMED, `Fetching prebuild for ${structUtils.stringifyIdent(nativeModule)} version ${nativeModule.version} on runtime electron version ${electronVersion}`)

    if (nativeModule.version === null) {
      throw new ReportError(MessageName.UNNAMED, `Could not find the native module version that had a prebuild attempt`);
    }

    const registryData = await npmHttpUtils.get(npmHttpUtils.getIdentUrl(nativeModule), {
      configuration: opts.project.configuration,
      ident: locator,
      json: true,
    });

    if (!Object.prototype.hasOwnProperty.call(registryData, `versions`)) {
      throw new ReportError(MessageName.REMOTE_INVALID, `Registry returned invalid data for - missing "versions" field`);
    }

    if (!Object.prototype.hasOwnProperty.call(registryData.versions, nativeModule.version)) {
      throw new ReportError(MessageName.REMOTE_NOT_FOUND, `Registry failed to return reference "${nativeModule.version}"`);
    }

    const data = registryData.versions[nativeModule.version]
    const repository = data.repository?.url

    if (!repository) {
      throw new ReportError(MessageName.UNNAMED, `Unable to find repository information for "${structUtils.stringifyIdent(nativeModule)}"`);
    }

    const githubUrl = utils.gitRepositoryToGithubLink(repository)

    if (!githubUrl) {
      throw new ReportError(MessageName.UNNAMED, `Unable to find GitHub URL for "${structUtils.stringifyIdent(nativeModule)}"`);
    }

    const prebuildOptions: PrebuildCalculatedOptions = {
      abi: electronVersion ? utils.getElectronABI(electronVersion) : process.versions.modules,
      runtime: electronVersion ? 'electron' : 'node'
    }

    const prebuildUrl = utils.getUrlOfPrebuild(githubUrl, nativeModule, opts, prebuildOptions)

    const {
      packageFs: prebuildPackageFs,
      releaseFs: prebuildReleaseFs,
      prefixPath: prebuildPrefixPath,
      checksum: prebuildChecksum,
    } = await opts.fetcher.fetch(structUtils.makeLocator(structUtils.makeIdent(`prebuilds`, `${structUtils.slugifyIdent(nativeModule)}-v${nativeModule.version}-${process.platform}-${process.arch}-${prebuildOptions.runtime}-${prebuildOptions.abi}`), prebuildUrl), opts)

    opts.report.reportInfo(MessageName.UNNAMED, `Fetched prebuild for ${structUtils.stringifyIdent(nativeModule)} version ${nativeModule.version} on runtime electron version ${electronVersion}`)

    console.log(
      prebuildPrefixPath,
      prebuildChecksum
    )

    // @serialport/bindings@

    console.log(`Fetched prebuild successfully`)

    // https://registry.eui.io/prebuilds/@serialport/bindings-v8.0.7-electron-v76-darwin-x64.tar.gz
    // https://registry.eui.io/prebuilds/@serialport/bindings@8.0.7/bindings-v8.0.7-electron-v76-darwin-x64.tar.gz

    const prebuildFs = new CwdFS(prebuildPrefixPath, {baseFs: prebuildPackageFs,});

    const walk = async (currentPath: PortablePath, callback: (filepath: PortablePath) => Promise<void>) => {
      const files = await prebuildFs.readdirPromise(currentPath)

      await Promise.all(
        files.map(async filename => {
          const filepath = ppath.join(currentPath, filename)

          const stat = await prebuildFs.statPromise(filepath)

          if (stat.isDirectory()) {
            await walk(filepath, callback)
          } else if (stat.isFile()) {
            await callback(filepath)
          }
        })
      )
    }

    await walk('.' as PortablePath, async (filepath) => {
      console.log("Found file in the prebuild tar", filepath)
    })

    if (prebuildReleaseFs) {
      prebuildReleaseFs()
    }

    throw new Error()

    const tmpDir = await xfs.mktempPromise();
    const tmpFile = ppath.join(tmpDir, `prebuilt.zip` as Filename);

    //const sourceFetch = await opts.fetcher.fetch(sourceLocator, opts);
    const prefixPath = structUtils.getIdentVendorPath(locator);

    const libzip = await getLibzipPromise();

    const copiedPackage = new ZipFS(tmpFile, {libzip, create: true});
    await copiedPackage.mkdirpPromise(prefixPath);

    // await miscUtils.releaseAfterUseAsync(async () => {
    //   await copiedPackage.copyPromise(prefixPath, sourceFetch.prefixPath, {baseFs: sourceFetch.packageFs});
    // }, sourceFetch.releaseFs);

    copiedPackage.saveAndClose();

    const generatedPackage = new ZipFS(tmpFile, {libzip});
    const patchFs = new CwdFS(prefixPath, {baseFs: generatedPackage});

    // Write our package.json
    await generatedPackage.writeJsonPromise(ppath.join(prefixPath, 'package.json' as Filename), {
      name: structUtils.slugifyLocator(locator),
      main: "./index.js"
    })

    // write our index.js
    const templateIndex = `// This file is automatically generated
    const staticRequire = require("./bindings.node");
    module.exports = (fileLookingFor) => {
      console.log("was looking for file", fileLookingFor, "but we replaced it!");

      return staticRequire;
    };
    `
    await generatedPackage.writeFilePromise(ppath.join(prefixPath, 'index.js' as Filename), templateIndex)

    // write our index.js
    const templateNode = `// This file is automatically generated
    module.exports = () => {
      console.log("this should be the node file");
    };
    `
    await generatedPackage.writeFilePromise(ppath.join(prefixPath, 'bindings.node' as Filename), templateNode)

    // for (const patchFile of patchFiles) {
    //   if (patchFile !== null) {
    //     await patchUtils.applyPatchFile(patchUtils.parsePatchFile(patchFile), {
    //       baseFs: patchFs,
    //       version: sourceVersion,
    //     });
    //   }
    // }

    return generatedPackage;
  }
}
