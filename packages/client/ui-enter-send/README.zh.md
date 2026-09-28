---
description: "Web GUI 的输入框 Enter 绑定：Cmd/Ctrl+Enter 发送、普通 Enter 插入换行，供偏好该组合而非随附 Enter 发送默认行为的部署使用。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-enter-send

[English](README.md) | 中文

## Summary

本插件反转 Web 输入框的 Enter 手势：Cmd/Ctrl+Enter 提交草稿，普通 Enter 插入换行，Shift+Enter 保持其无条件换行。它只贡献一个浏览器服务、自身没有任何 UI，也不改变提交所投递的内容——同一条提交路径、同样的投递模式和 busy 状态策略照常生效。本包只影响浏览器按键处理；它不组装也不发送模型请求。

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

把这一行与 `ui-conversation` 一起挂载，输入框的 Enter 含义随即改变：Cmd/Ctrl+Enter 成为唯一的提交手势，其余被询问的 Enter（包括长按重复的）都落到编辑器自身的换行。随附的 Web 花名册已把它作为 `ui-enter-send` 行携带；删除该行，或在 `$DSH_HOME/cordis.patch.yml` 里禁用它，即恢复默认绑定——普通 Enter 发送、Shift+Enter 换行，两种方向都不需要改动输入框。

Cmd/Ctrl+Enter 以加速手势提交，与默认绑定下该组合的行为完全一致：当被寻址的智能体正在运行时，它执行由 Host settings 支撑的 busy-Enter 偏好的互补投递（默认 `Queue` 偏好下即插话），草稿为空时则把仍在排队的消息全部插话进运行中的轮次。普通 Enter 永不提交，因此在撰写多行草稿时不会误发消息。

命令仍然拥有它周围的按键：打开的 `/` 或 `@` 菜单仍以 Enter 选定高亮项，IME 组合保留自己的 Enter，输入框自行消费的组合（Alt、AltGraph、Ctrl+Cmd、Ctrl/Cmd+Shift）保持不变。

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

浏览器半区提供 `composerEnterBinding`——即 `ui-conversation` 在 `contract/enter-binding.ts` 中声明的可选服务——实现为关于 keydown 修饰键的纯函数（`gesture.ctrl || gesture.meta ? 'submit' : 'newline'`）。composer bar 在每次 inject 时用 `ctx.get` 解析该服务，并在本行缺席时回退到随附的 `DEFAULT_ENTER_BINDING`（每个被询问的 Enter 都提交），因此插件本身就是全部开关，输入框无需知道它的存在。该绑定是进程级的，与其余客户端服务一致；按会话的手势需要另一条接缝。本包不发布 `./invariant`伴随：绑定是其入参的纯函数，而 provide 是由 cordis 服务注册表拥有的 effect，不存在第二套运行时可比较的权威。

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [ui-conversation](../ui-conversation/README.zh.md) —— 拥有输入框、Enter keymap，以及本插件所填充的 `composerEnterBinding` 接缝。
- [输入框 Enter 键绑定注记](../../../.agents/notes/implemented/feature/2026-08-18-composer-enter-binding.zh.md) —— 为什么这条接缝是服务加插件行，而不是一个设置项。
- [Web 客户端架构](../../../docs/subsystems/web-client.zh.md) —— 浏览器插件行如何加载、注册与被组合移除。

-----

<a id="model-experience"></a>
## Model Experience

None，因为该绑定只决定一个浏览器按键手势；这里没有任何内容到达模型请求。

#### KV Cache effect

None；本包既不组装也不发送 provider 请求。

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Shift+Enter 无法重绑定为提交。** 输入框在任何绑定之前就把 Shift+Enter 判定为无条件原生换行（其 IME 守卫），因此要做到这点必须改输入框本身，而不是提供一个绑定。
- **绑定在下一次 inject 时生效。** composer bar 按 inject 解析服务，因此在某个会话的输入栏已经渲染之后才挂载的插件，要到该会话下一次重挂载才生效；重启页面是可靠的激活路径。
- **每个进程只有一个二选一。** 该服务对每个 Session 都从其自身调用点作答，而随附花名册只组合一个绑定。

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>

**Runtime invariant:** No companion is published. 绑定是其自身入参的纯函数，而 provide 是由 cordis 服务注册表拥有的 effect；注册的释放由本包的服务 spec 断言。
