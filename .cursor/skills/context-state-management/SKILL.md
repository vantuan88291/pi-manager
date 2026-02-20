---
name: context-state-management
description: Create and manage React Context providers, consumers, and hooks for global state in this React Native project. Use when adding new context, creating providers, managing global state, or when the user asks about state management patterns.
---

# Context State Management

## Overview

This project uses React Context as the sole global state management solution. Follow the established pattern from `app/theme/context.tsx` when creating new contexts.

## Quick Start — Creating a New Context

### Step 1: Create types

Create `app/<domain>/types.ts`:

```typescript
export interface MyState {
  value: string
  isLoading: boolean
}

export type MyContextType = {
  state: MyState
  setState: (newState: Partial<MyState>) => void
  reset: () => void
}
```

### Step 2: Create context file

Create `app/<domain>/context.tsx`:

```typescript
import { createContext, FC, PropsWithChildren, useCallback, useContext, useMemo, useState } from "react"
import type { MyContextType, MyState } from "./types"

const DEFAULT_STATE: MyState = { value: "", isLoading: false }

export const MyContext = createContext<MyContextType | null>(null)

export const MyProvider: FC<PropsWithChildren> = ({ children }) => {
  const [state, setStateRaw] = useState<MyState>(DEFAULT_STATE)

  const setState = useCallback((partial: Partial<MyState>) => {
    setStateRaw((prev) => ({ ...prev, ...partial }))
  }, [])

  const reset = useCallback(() => {
    setStateRaw(DEFAULT_STATE)
  }, [])

  const value = useMemo(() => ({ state, setState, reset }), [state, setState, reset])

  return <MyContext.Provider value={value}>{children}</MyContext.Provider>
}

export const useMyContext = () => {
  const context = useContext(MyContext)
  if (!context) {
    throw new Error("useMyContext must be used within MyProvider")
  }
  return context
}
```

### Step 3: Add persistence (if needed)

Replace `useState` with MMKV for data that survives app restarts:

```typescript
import { useMMKVObject } from "react-native-mmkv"
import { storage } from "@/utils/storage"

const [state, setState] = useMMKVObject<MyState>("my-domain.state", storage)
```

### Step 4: Register provider in `app/app.tsx`

Add inside the existing provider hierarchy:

```tsx
<SafeAreaProvider initialMetrics={initialWindowMetrics}>
  <KeyboardProvider>
    <ThemeProvider>
      <MyProvider>
        <AppNavigator ... />
      </MyProvider>
    </ThemeProvider>
  </KeyboardProvider>
</SafeAreaProvider>
```

### Step 5: Consume in screens/components

```typescript
import { useMyContext } from "@/my-domain/context"

export const MyScreen: FC = () => {
  const { state, setState } = useMyContext()
  const { themed } = useAppTheme()

  return (
    <Screen preset="scroll">
      <Text text={state.value} />
      <Button onPress={() => setState({ value: "updated" })} />
    </Screen>
  )
}
```

## Conventions

| Rule | Detail |
|------|--------|
| Context default | Always `createContext<T \| null>(null)` |
| Hook guard | Custom hook must throw if context is null |
| Memoization | Wrap context value in `useMemo`, functions in `useCallback` |
| Persistence | Use `react-native-mmkv` via `@/utils/storage` |
| File structure | `context.tsx`, `types.ts`, `context.utils.ts` (optional) |
| Naming | `XxxProvider`, `useXxx()`, `XxxContext`, `XxxContextType` |
| Side effects | Isolate in `context.utils.ts` |

## Existing Context Reference

### ThemeContext (`app/theme/context.tsx`)

Provider: `ThemeProvider`
Hook: `useAppTheme()`

Exposes:
- `theme` — current `Theme` object (colors, spacing, typography, timing, isDark)
- `themed(styleFn)` — resolves `ThemedStyle<T>` functions against current theme
- `themeContext` — `"light"` | `"dark"`
- `setThemeContextOverride(mode)` — override theme (`"light"`, `"dark"`, or `undefined` for system)
- `navigationTheme` — React Navigation theme object

### ThemedStyle Pattern

```typescript
import type { ThemedStyle } from "@/theme/types"
import type { ViewStyle } from "react-native"

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  backgroundColor: colors.background,
  paddingHorizontal: spacing.lg,
})
```

## Anti-Patterns

- Do NOT use Redux, MobX, Zustand, or Jotai — this project standardizes on Context
- Do NOT store the context value as an inline object literal (causes re-renders every render)
- Do NOT skip the null-check in custom hooks
- Do NOT put heavy computation inside context providers without `useMemo`
