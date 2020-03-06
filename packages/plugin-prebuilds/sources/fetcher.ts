import {Fetcher, FetchOptions, MinimalFetchOptions, miscUtils} from '@yarnpkg/core';
import {ReportError, MessageName, Resolver, ResolveOptions, MinimalResolveOptions, Manifest, DescriptorHash, Package} from '@yarnpkg/core';
import {Descriptor, Locator}                                                                                          from '@yarnpkg/core';
import {LinkType}                                                                                                     from '@yarnpkg/core';
import {structUtils}                                                                                                  from '@yarnpkg/core';
import {ppath, xfs, ZipFS, Filename, CwdFS, PortablePath, FakeFS}         from '@yarnpkg/fslib';
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
    const prebuildPackage = await opts.fetcher.fetch(structUtils.makeLocator(structUtils.makeIdent(`prebuilds`, `${structUtils.slugifyIdent(nativeModule)}-v${nativeModule.version}-${process.platform}-${process.arch}-${prebuildOptions.runtime}-${prebuildOptions.abi}`), prebuildUrl), opts)

    opts.report.reportInfo(MessageName.UNNAMED, `Fetched prebuild for ${structUtils.stringifyIdent(nativeModule)} version ${nativeModule.version} on runtime electron version ${electronVersion}`)

    const cancellationSignal = { cancel: false }
    let nodeContents: Buffer | null = null
    let bindingsLocation = ""

    // Walk the downloaded prebuild directory, find the file
    await miscUtils.releaseAfterUseAsync(async () => {
      await utils.walk(prebuildPackage.packageFs, '.' as PortablePath, async (filesystem, filepath) => {
        nodeContents = await filesystem.readFilePromise(filepath)
        bindingsLocation = filepath

        // send the break signal
        cancellationSignal.cancel = true
      }, cancellationSignal)
    }, prebuildPackage.releaseFs)

    if (nodeContents === null) {
      throw new ReportError(MessageName.UNNAMED, `Was unable to find node file in prebuild package for "${structUtils.stringifyIdent(nativeModule)}"`);
    }

    const tmpDir = await xfs.mktempPromise();
    const tmpFile = ppath.join(tmpDir, `prebuilt.zip` as Filename);
    const prefixPath = structUtils.getIdentVendorPath(locator);

    const libzip = await getLibzipPromise();

    const zipPackage = new ZipFS(tmpFile, {libzip, create: true});
    await zipPackage.mkdirpPromise(prefixPath);

    const generatedPackage = new CwdFS(prefixPath, {baseFs: zipPackage});


    // Write our package.json
    await generatedPackage.writeJsonPromise('package.json' as Filename, {
      name: structUtils.slugifyLocator(locator),
      main: "./index.js"
    })

    // write our index.js
    const templateIndex = `// Automatically generated bindings file
// Bindings taken from ${bindingsLocation}

const staticRequire = require("./bindings.node");
module.exports = (fileLookingFor) => {
  console.log("was looking for file", fileLookingFor, "but we replaced it!");

  return staticRequire;
};
    `
    await generatedPackage.writeFilePromise('index.js' as Filename, templateIndex)

    // Write the file into the generated package
    await generatedPackage.writeFilePromise('bindings.node' as Filename, nodeContents)

    return zipPackage;
  }
}
