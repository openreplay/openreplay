import type { NodePath, PluginObject, types as t } from '@babel/core';

/**
 * Babel plugin that opts MobX-reading functions out of React Compiler by
 * prepending the `"use no memo"` directive.
 *
 * React Compiler memoizes on identity: `store.items.map(...)` is cached until
 * `store.items` is a different object. MobX mutates in place, so an observer
 * component that re-rendered because `items` changed would still return the
 * cached JSX. Any function that reads a store is therefore left uncompiled:
 *
 *  - every function passed to `observer(...)` (inline, or a local binding,
 *    including through `memo`/`forwardRef` wrappers);
 *  - every function that calls `useStore()` — hooks and non-observer components
 *    that read the store the way they do today.
 *
 * Must run before babel-plugin-react-compiler, which checks the directive on
 * every function it considers.
 */

const MOBX_REACT_MODULES = new Set(['mobx-react-lite', 'mobx-react']);
const STORE_MODULE_RE = /(^|\/)mstore$/;
const OPT_OUT_RE = /^use (no )?memo$/;

type FunctionPath = NodePath<t.Function>;

const importOf = (
  path: NodePath<t.Identifier>,
): { source: string; name: string } | null => {
  const binding = path.scope.getBinding(path.node.name);
  const spec = binding?.path;
  if (!spec?.isImportSpecifier()) return null;
  const decl = spec.parentPath;
  if (!decl.isImportDeclaration()) return null;
  const { imported } = spec.node;
  return {
    source: decl.node.source.value,
    name: imported.type === 'Identifier' ? imported.name : imported.value,
  };
};

const collectFunctions = (
  path: NodePath,
  out: Set<FunctionPath>,
  seen = new Set<NodePath>(),
) => {
  if (seen.has(path)) return;
  seen.add(path);

  if (path.isFunction()) {
    out.add(path);
  } else if (path.isIdentifier()) {
    const binding = path.scope.getBinding(path.node.name);
    if (!binding) return;
    if (binding.path.isVariableDeclarator()) {
      const init = binding.path.get('init');
      if (init.node) collectFunctions(init as NodePath, out, seen);
    } else {
      collectFunctions(binding.path, out, seen);
    }
  } else if (path.isCallExpression()) {
    // observer(memo(Foo)), observer(forwardRef((props, ref) => ...))
    for (const arg of path.get('arguments')) collectFunctions(arg, out, seen);
  }
};

export default function babelMobxNoMemo({
  types: T,
}: {
  types: typeof t;
}): PluginObject {
  const optOut = (fn: FunctionPath) => {
    const body = fn.get('body');
    if (!body.isBlockStatement()) {
      body.replaceWith(
        T.blockStatement([T.returnStatement(body.node as t.Expression)]),
      );
    }
    const block = fn.node.body as t.BlockStatement;
    if (block.directives.some((d) => OPT_OUT_RE.test(d.value.value))) return;
    block.directives.unshift(T.directive(T.directiveLiteral('use no memo')));
  };

  return {
    name: 'mobx-no-memo',
    visitor: {
      Program(program) {
        const targets = new Set<FunctionPath>();

        program.traverse({
          CallExpression(call) {
            const callee = call.get('callee');
            if (!callee.isIdentifier()) return;
            const imp = importOf(callee);
            if (!imp) return;

            if (imp.name === 'observer' && MOBX_REACT_MODULES.has(imp.source)) {
              for (const arg of call.get('arguments')) {
                collectFunctions(arg, targets);
              }
            } else if (
              imp.name === 'useStore' &&
              STORE_MODULE_RE.test(imp.source)
            ) {
              const fn = call.getFunctionParent();
              if (fn) targets.add(fn);
            }
          },
        });

        for (const fn of targets) optOut(fn);
      },
    },
  };
}
