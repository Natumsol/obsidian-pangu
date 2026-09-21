# Domain Docs

本仓库采用单项目上下文布局：

- 根目录 `CONTEXT.md`：项目术语及其含义。
- `docs/adr/`：需要长期保留的设计决策。

## Reading rules

探索代码前，读取已有的 `CONTEXT.md` 和与任务相关的 ADR。

若未来存在 `CONTEXT-MAP.md`，按其中的映射读取相关上下文。

这些文件缺失时直接继续，不为完成配置创建空文件。通过 domain-modeling、grill-with-docs 等工作流确认术语或决策后，再按需建立文档。

## Vocabulary and decisions

- Issue 标题、设计讨论和测试命名沿用 `CONTEXT.md` 定义的术语。
- 新术语或现有术语的歧义，应在领域建模时明确，不随意引入近义名称。
- 若提议与已有 ADR 冲突，指出具体 ADR、冲突内容及是否需要重新讨论；不得静默覆盖既有决策。
