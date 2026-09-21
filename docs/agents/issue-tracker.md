# Issue tracker: GitHub

本仓库使用 `Natumsol/obsidian-pangu` 的 GitHub Issues 记录需求、缺陷和 PRD，通过 `gh` CLI 操作。

## Read workflows

- 先用 `git remote -v` 核对目标仓库。
- 查看 Issue：`gh issue view <number> -R Natumsol/obsidian-pangu --json number,title,body,comments,labels,state,url`。
- 查看开放队列：`gh issue list -R Natumsol/obsidian-pangu --state open --limit 100 --json number,title,labels,url`；结果达到上限时继续分页，避免将截断结果当作全部。
- GitHub 的 Issue 和 PR 共用编号；遇到 PR 引用时用 `gh pr view <number>` 确认类型与内容。
- 需求依据包括正文、相关评论和当前会话中的用户澄清；在评审结果中注明来源。

## Write workflows

在用户任务或明确调用的技能授权范围内执行：

- 新建：`gh issue create -R Natumsol/obsidian-pangu --title <title> --body-file <path>`。
- 评论：`gh issue comment <number> -R Natumsol/obsidian-pangu --body-file <path>`。
- 标签：`gh issue edit <number> -R Natumsol/obsidian-pangu --add-label <label>`，移除用 `--remove-label`。
- 关闭：`gh issue close <number> -R Natumsol/obsidian-pangu`；事先核对修复或关闭理由，不将本地修改误报为已发布。

多行正文使用文件传递，保留真实换行。纯查询和评审任务不隐含修改远端状态的授权。

## Pull requests as a triage surface

**PRs as a request surface: no.**

PR 默认不进入外部需求 triage 队列；需要时可在此修改配置。
