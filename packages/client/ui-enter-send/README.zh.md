# @deepseek-ai/dsh-client-ui-enter-send

[English](README.md) | 中文

Web 输入框 Enter 绑定插件：浏览器半区提供 `composerEnterBinding` 服务，会话输入栏会为每次 Enter 键询问它。该绑定让 Cmd/Ctrl+Enter 提交草稿——即 busy 状态提交策略所解析的加速手势（主会话以默认 Queue 偏好运行时插话，空草稿时则把整条队列插话进当前轮次）——并让普通 Enter 原生插入换行。Shift+Enter 仍然是无条件换行，在输入栏里先于任何绑定判定，与本插件缺席时完全一致。随附的 Web patch 是唯一加载本包的组合；删除它的那一条 cordis.yml 条目（`ui-enter-send`）即恢复默认绑定——Enter 提交、Shift+Enter 换行。

绑定是按键修饰符的纯函数，因此本插件没有状态、没有 settings 命名空间、也没有按会话的表面：挂载这一行就是全部选择。IME 组合与弹层仲裁保持既有优先级——组合中的 Enter 确认输入法候选，打开的斜杠菜单仍然让 Enter 选中高亮命令。

## Model Experience

None，因为该绑定只决定一个浏览器按键手势；这里没有任何内容到达模型请求。

#### KV Cache effect

None；本包既不组装也不发送 provider 请求。

## Known Limitations and Deferred Work

- **Shift+Enter 无法重绑定为提交。**输入栏在任何绑定之前把 Shift+Enter 视为无条件原生换行（IME 组合守卫），因此想让 Shift+Enter 提交的绑定需要改动输入框本身，而不是插件。
- **绑定在会话首次渲染时固定。**输入栏按 inject 解析服务，因此会话输入栏已经渲染之后才挂载的插件要到该会话下一次重挂载才生效；重启页面是可靠的激活路径。
