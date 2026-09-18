---
feature: content-error-generics
status: designed
updated: 2026-09-17
branch: chore/content-error-generics
commits: 
---

# Content — Error Handling + Generics Chapters

## Report

## [S1] Problem

目录到 09，工程向高频八股仍缺 `error` 包装/判定与泛型类型约束直觉。

## [S2] Design

| 章 | 文件 | id | Lab |
|----|------|-----|-----|
| 10 错误处理 | `error.html` | `error` | Error Lab：包装链 → Is/As 判定 |
| 11 泛型直觉 | `generics.html` | `generics` | Generics Lab：约束集选择 + 类型实参示例 |

### 接入

- `chapters.js` 增加 idx 10/11；首页卡片；阅读链 string → error → generics → home。
- check.sh need[] 与相对路径循环追加两页两 lab。
- 复用 guide/motion/story-band。

### Lab 契约

**Error Lab**
- 场景：底层 `ErrNotFound` → 中层 `fmt.Errorf("db: %w", err)` → 上层再包装。
- 操作：`包装一层`、`errors.Is(err, ErrNotFound)`、`errors.As`（到自定义类型）。
- 日志显示链路与判定 true/false。

**Generics Lab**
- 操作：选约束（`int | float64`、`constraints.Ordered` 示意、`any`）+ 选实参类型 → 展示可实例化函数签名与结果示例。
- 强调：类型参数在编译期单态化/字典，运行时无「鸭子类型」魔法。

## [S3] Out of Scope

- 完整 constraints 包 API、代码生成、reflect 深讲

## Tasks

- [ ] T1: 清单/首页/底链/check — acceptance: manifest 10/11 可达，check PASS (covers: S2)
- [ ] T2: error 章 + Lab — acceptance: Is 对包装链返回 true；As 提取类型成功 (covers: S2)
- [ ] T3: generics 章 + Lab — acceptance: 约束与实参组合合法时输出示例 (covers: S2)
- [ ] T4: 验收 — acceptance: 冒烟 0 console error (covers: S2; depends: T1,T2,T3)
