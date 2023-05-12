export function isRootNode(node: Node): node is Document {
  return node.nodeType === Node.DOCUMENT_NODE || node instanceof Document
}