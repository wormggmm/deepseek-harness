# Agent Note: 输入框 Enter 键绑定

Status: implemented

[English](2026-08-18-composer-enter-binding.md) | 中文

## Problem

输入框的 Enter 语义是 InputBar 的 keydown 处理器里的一段硬编码分支：Shift+Enter 无条件插入换行，其余 Enter 一律提交，Cmd/Ctrl 标记 busy 状态策略所用的加速手势。想要 Ctrl+Enter 发送、普通 Enter 插入换行的部署没有任何表达这个意愿的接缝——只能改输入框本身，或者整体替换 `conversation.composer.bar` 槽位（一个 single 座位，占据它意味着连同草稿机、装饰层、拖拽摄入、Safari 修复在内重写整条输入栏）。

## Decision

**输入栏解析一个可选的 `composerEnterBinding` 服务，并在每个通过既有守卫的 Enter keydown 上询问它。**该服务沿用 `chatFileMentions` 先例：ui-conversation 在 `contract/enter-binding.ts` 里声明 `ComposerEnterBinding` 契约与 cordis Context 合并，在 composer-bar 的 inject 工厂里用 `ctx.get` 消费（因此后挂载的插件会在下一次 inject 时被拾取），没有插件提供时回退到随附的 `DEFAULT_ENTER_BINDING`（每个被询问的 Enter 都提交）。InputBar 在 IME 组合守卫与弹层仲裁之后、`preventDefault` 之前咨询绑定：答案是 `'newline'` 就让原生的文本域插入继续，答案是 `'submit'` 就走既有的提交路径，行为不变。Shift+Enter 仍然是无条件原生换行，在绑定之前判定，这样关闭 IME 组合的 Shift+Enter 依然断行；绑定契约里的 `shift` 字段按说明只是信息性的。

**反向绑定以插件形式随附，而不是作为输入框的一个选项。**部署方通过 profile patch 层组合自己的绑定插件——参考实现是 `@deepseek-ai/dsh-client-ui-enter-send`（Cmd/Ctrl+Enter 提交，其余按键插入换行），由产生本次改动的 fork 携带——没有任何 provider 时使用随附默认。busy 状态策略原样不动：运行中加速手势仍然插话，空草稿的加速手势仍然把整条队列插进当前轮次，因为绑定只决定哪些键能走到提交路径。

## Alternatives considered

**在会话命名空间上加一个 `sendOn` 设置字段**（`busyEnter` 的形状：一个 `ConversationSettings` 键、一条 General 设置行、一份持久的 `settings.yaml` 值）。否决：它把一种产品意见固化成头等设置，给每个用户一个本部署只想要固定默认值的开关；插件行本身就是关闭开关，与其余功能插件的表面一致，而且设置字段仍需要它本想避免的 InputBar 分支。

**用一个 fork 的 InputBar 替换 `conversation.composer.bar` 槽位。**否决：该座位是 `kind: 'single'` 且 `session-maybe`，fork 意味着为了一个键重写整条输入栏（草稿镜像、装饰、拖拽摄入、Safari 修复、控制座位），而输入栏的任何后续改进都得复制进 fork。

**完整的键位表注册表**（多个具名绑定、按会话解析、一个设置表面）。否决：属于投机——今天只有一个消费者和一种替代绑定；服务接缝已经是未来注册表所需的形状，现在扩张它只会增加一个没人用的接口。

**在槽位系统之外做 DOM 层 keydown 拦截**（一个在 InputBar 之前吞掉 Enter 的 document 监听器）。否决：它与输入框自己的仲裁和 IME 处理打架，无法区分输入框与其他吃 Enter 的输入，而且不像服务那样能跟输入框的重新挂载生命周期走。

## Consequences

没有插件的组合与之前逐字节一致：`DEFAULT_ENTER_BINDING` 把每个被询问的 Enter 解析为提交，无条件 Shift+Enter 换行不变。web e2e 车道不受影响，因为场景都用发送按钮提交，从不按 Enter 键。绑定是进程级的而不是按会话的——与其余客户端服务一致——按会话选择需要另一条接缝。输入框按 inject 解析服务，因此会话输入栏渲染之后才挂载的插件要到该会话下一次重挂载才生效；重启页面是可靠的激活路径。Shift+Enter 按设计保持不可重绑定；要让它可重绑定，就得把 IME 守卫挪进绑定契约，当前没有消费者需要。busy-Enter 偏好（[host 支持的偏好](../bug-fix/2026-08-06-host-backed-web-preferences.md)）与输入机（[web 输入机与斜杠管道](../architecture/2026-07-25-web-input-machine-and-slash-pipeline.md)）均未改动：绑定位于两者上游。
