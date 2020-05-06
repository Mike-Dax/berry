import {Descriptor, Project, Locator, Resolver, ResolveOptions, MessageName, structUtils} from '@yarnpkg/core';


export const reduceDependency = async (
  dependency: Descriptor,
  project: Project,
  locator: Locator,
  initialDependency: Descriptor,
  extra: {resolver: Resolver, resolveOptions: ResolveOptions},
) => {
  if (dependency.name === `bindings` && dependency.scope === null) {
    // extra.resolveOptions.report.reportInfo(MessageName.UNNAMED, `Found a bindings dependency in ${structUtils.stringifyIdent(locator)}, re-routing to prebuild.`);

    const selector = `builtin<prebuild/${structUtils.stringifyIdent(locator)}>`; // TODO: Add process.platform and arch to this

    return structUtils.makeDescriptor(dependency, structUtils.makeRange({
      protocol: `prebuild:`,
      source: `bindings<${structUtils.slugifyIdent(locator)}>${process.platform}-${process.arch}`,
      selector,
      params: null,
    }));
  }

  return dependency;
};
