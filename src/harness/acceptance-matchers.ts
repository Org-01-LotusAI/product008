import { parsers } from "prettier/plugins/typescript";

interface Node {
  type: string;
  range: [number, number];
  [key: string]: unknown;
}

// RTL matcher callbacks use truthiness at runtime but require boolean in their
// types. Coerce inline query predicates without changing what they match.
export function normalizeAcceptanceMatchers(code: string) {
  const parse = parsers.typescript.parse as (
    text: string,
    options: unknown,
  ) => Node;
  const source = parse(code, {});
  const edits: { start: number; end: number; text: string }[] = [];
  function visitChildren(node: Node, visit: (child: Node) => void) {
    for (const [key, value] of Object.entries(node)) {
      if (["comments", "tokens", "loc", "range"].includes(key)) continue;
      for (const child of Array.isArray(value) ? value : [value]) {
        if (child && typeof child === "object" && "type" in child)
          visit(child as Node);
      }
    }
  }
  function coerce(expression: Node) {
    edits.push({
      start: expression.range[0],
      end: expression.range[1],
      text: `!!(${code.slice(...expression.range)})`,
    });
  }
  function returns(node: Node) {
    if (
      [
        "ArrowFunctionExpression",
        "FunctionExpression",
        "FunctionDeclaration",
      ].includes(node.type)
    )
      return;
    if (node.type === "ReturnStatement") {
      if (node.argument) coerce(node.argument as Node);
      else
        edits.push({
          start: node.range[0],
          end: node.range[1],
          text: "return false;",
        });
      return;
    }
    visitChildren(node, returns);
  }
  function visit(node: Node) {
    if (node.type === "CallExpression") {
      const callee = node.callee as Node;
      const name =
        callee.type === "MemberExpression" && !callee.computed
          ? (callee.property as Node).name
          : callee.type === "Identifier"
            ? callee.name
            : undefined;
      if (
        typeof name === "string" &&
        /^(get|query|find)(All)?By(Text|LabelText|PlaceholderText|AltText|Title|DisplayValue|TestId)$/.test(
          name,
        )
      ) {
        const callback = (node.arguments as Node[])[0];
        if (
          callback &&
          ["ArrowFunctionExpression", "FunctionExpression"].includes(
            callback.type,
          )
        ) {
          const body = callback.body as Node;
          if (body.type === "BlockStatement") {
            returns(body);
            // A block predicate may also fall through without returning.
            edits.push({
              start: body.range[1] - 1,
              end: body.range[1] - 1,
              text: "\nreturn false;\n",
            });
          } else coerce(body);
          return;
        }
      }
    }
    visitChildren(node, visit);
  }
  visit(source);
  for (const edit of edits.sort((a, b) => b.start - a.start))
    code = code.slice(0, edit.start) + edit.text + code.slice(edit.end);
  return code;
}
