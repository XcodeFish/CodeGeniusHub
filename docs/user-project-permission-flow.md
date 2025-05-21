# 系统权限与项目权限说明文档

## 权限体系概述

系统采用两级权限管理体系：

1. 系统权限（用户权限）
2. 项目权限

## 系统权限说明

### 系统管理员（Admin）

- 可以查看和管理所有项目
- 可以分配项目权限
- 可以操作所有项目
- 不受项目权限限制

### 普通用户（Editor/Viewer）

- 只能查看被分配的项目
- 具体操作权限由项目权限决定
- 受项目权限限制

## 项目权限说明

### 项目查看者（Viewer）

- 只能查看项目信息
- 无法进行编辑操作
- 无法管理项目成员

### 项目编辑者（Editor）

- 可以查看项目信息
- 可以编辑项目内容
- 可以管理项目文档
- 无法管理项目成员

### 项目管理员（Admin）

- 可以查看项目信息
- 可以编辑项目内容
- 可以管理项目文档
- 可以管理项目成员
- 可以设置项目权限

## 权限关系说明

1. 系统权限决定用户可见的项目范围
2. 项目权限决定用户对具体项目的操作权限
3. 系统管理员（Admin）权限可以覆盖项目权限限制
4. 其他系统权限（Editor/Viewer）受项目权限限制

## 权限流程图

```mermaid
graph TD
    %% 用户权限部分
    A[用户注册] -->|系统权限分配| B{系统权限}
    B -->|Admin| C[系统管理员]
    B -->|Editor/Viewer| D[普通用户]

    %% 系统管理员权限
    C -->|可以| C1[管理所有项目]
    C -->|可以| C2[分配项目权限]
    C -->|可以| C3[操作所有项目]

    %% 普通用户权限
    D -->|只能| D1[查看被分配的项目]
    D --> E[项目权限分配]

    %% 项目权限说明
    E -->|项目A| F[项目Viewer权限]
    E -->|项目B| G[项目Editor权限]
    E -->|项目C| H[项目Admin权限]

    %% 项目权限具体操作
    F -->|只能| F1[查看项目A]
    G -->|可以| G1[编辑项目B]
    H -->|可以| H1[管理项目C]

    %% 样式设置
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
    style C fill:#f96,stroke:#333,stroke-width:2px
    style D fill:#bbf,stroke:#333,stroke-width:2px
    style C1 fill:#f96,stroke:#333,stroke-width:2px
    style C2 fill:#f96,stroke:#333,stroke-width:2px
    style C3 fill:#f96,stroke:#333,stroke-width:2px
    style F fill:#dfd,stroke:#333,stroke-width:2px
    style G fill:#dfd,stroke:#333,stroke-width:2px
    style H fill:#dfd,stroke:#333,stroke-width:2px

    %% 权限说明
    subgraph 系统权限说明
        S1[系统Admin权限<br/>可以操作所有项目]
        S2[其他系统权限<br/>受项目权限限制]
    end
```

## 权限使用示例

### 示例1：系统管理员

- 系统权限：Admin
- 可以查看和管理所有项目
- 不受项目权限限制
- 可以随时介入任何项目

### 示例2：普通用户

- 系统权限：Editor
- 项目A权限：Viewer
  - 只能查看项目A
  - 无法编辑项目A
- 项目B权限：Editor
  - 可以查看项目B
  - 可以编辑项目B
- 项目C权限：Admin
  - 可以查看项目C
  - 可以编辑项目C
  - 可以管理项目C成员
