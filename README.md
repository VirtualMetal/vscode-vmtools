# VirtualMetal for Visual Studio Code

This extension adds VirtualMetal configuration and debugging support to Visual Studio Code.

## Features

- Syntax highlighting for VirtualMetal configuration files (`.vmconf`).

- Debugging of VirtualMetal instances.

    ```
    ┌───────────────────────┐
    │                       │
    │        VS Code        │
    │                       │
    └───────────────────────┘
                ▲
                │
                │ MI
                │
                ▼
    ┌───────────────────────┐          ┌───────────────────────┐
    │                       │   RSP    │                       │
    │    Console Debugger   │◄────────►│ VirtualMetal Debugger │
    │         (gdb)         │          │       (vm.exe)        │
    └───────────────────────┘          └───────────────────────┘
                                                   ▲
                                                   │
                                                   │ HV
                                                   │
                                                   ▼
                                       ┌───────────────────────┐
                                       │                       │
                                       │ VirtualMetal Instance │
                                       │                       │
                                       └───────────────────────┘


    MI - line based machine oriented text interface
    RSP - remote serial protocol
    HV - Hypevisor Control
    ```
