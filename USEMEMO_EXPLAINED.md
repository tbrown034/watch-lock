# Understanding `useMemo` in Watch-Lock

**Your Question:** "I still don't understand useMemo, whether we need it where we have it currently, etc"

---

## 📚 What is `useMemo`?

`useMemo` **memoizes** (caches) a calculated value so it doesn't get recalculated on every render.

```typescript
const cachedValue = useMemo(() => expensiveCalculation(), [dependency]);
```

### **Simple Analogy:**
Think of it like a smart calculator:
- **Without useMemo:** Calculator solves `2 + 2` every time you look at it = `4`
- **With useMemo:** Calculator solves `2 + 2` once, writes down `4`, and shows you that answer until the numbers change

---

## 🔍 Current Usage in Watch-Lock

### **Where we use it:**

1. **app/profile/page.tsx** (Line 52)
   ```typescript
   const supabase = useMemo(() => createClient(), []);
   ```

2. **app/games/page.tsx** (Line ~33)
   ```typescript
   const supabase = useMemo(() => createClient(), []);
   ```

3. **components/AuthHeader.tsx** (Line 18)
   ```typescript
   const supabase = useMemo(() => createClient(), []);
   ```

---

## ❓ Do We Actually Need It?

### **Short Answer:**
✅ **YES for profile/page.tsx** (uses `supabase` in dependency array)
⚠️ **NO for games/page.tsx** (doesn't use `supabase` in dependency arrays)
⚠️ **NO for AuthHeader.tsx** (doesn't use `supabase` in dependency arrays)

### **Let me explain why...**

---

## 🔬 Detailed Analysis

### **1. app/profile/page.tsx** ✅ **CORRECTLY USING `useMemo`**

```typescript
const supabase = useMemo(() => createClient(), []);

useEffect(() => {
  // ... code that uses supabase
}, [router, supabase]); // ← supabase is in dependency array!
```

**Why it's needed:**
- `supabase` is used in the `useEffect` dependency array (line 99)
- Without `useMemo`, a new client is created every render
- New client = new object reference = useEffect runs every render = **infinite loop**

**Verdict:** ✅ **KEEP IT**

---

### **2. app/games/page.tsx** ⚠️ **NOT TECHNICALLY NEEDED**

```typescript
const supabase = useMemo(() => createClient(), []);

// Check auth status
useEffect(() => {
  supabase.auth.getUser().then(({ data: { user } }) => {
    setUser(user);
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user ?? null);
  });

  return () => subscription.unsubscribe();
}, [supabase.auth]); // ← Uses `supabase.auth` (different object!)
```

**Analysis:**
- Dependency is `supabase.auth`, not `supabase`
- `supabase.auth` is a **getter** that returns a new object every time
- So `useMemo` on `supabase` doesn't actually help here!

**Problem:**
```typescript
}, [supabase.auth]); // ← This is ALWAYS a new object, even with useMemo!
```

**Verdict:** ⚠️ **`useMemo` doesn't help, but doesn't hurt either. Better fix: remove `supabase.auth` from dependencies**

---

### **3. components/AuthHeader.tsx** ⚠️ **NOT NEEDED**

```typescript
const supabase = useMemo(() => createClient(), []);

useEffect(() => {
  fetchUserAndProfile();

  // ... event listeners

  return () => {
    window.removeEventListener('profileUpdated', handleProfileUpdate);
    subscription.unsubscribe();
  };
}, []); // ← Empty dependency array! supabase not used!
```

**Why it's not needed:**
- `supabase` is NOT in the dependency array
- The useEffect runs once on mount (empty array)
- Creating the client with or without `useMemo` makes no difference

**Verdict:** ⚠️ **NOT NEEDED, but doesn't hurt**

---

## 🎯 Recommendations

### **Option 1: Keep It Simple (What Supabase Docs Recommend)**

Keep `useMemo` everywhere you create a Supabase client, even if not strictly needed.

**Why:**
- Consistent pattern across the codebase
- Follows official Supabase recommendations
- Prevents future bugs if someone adds `supabase` to a dependency array
- Minimal performance impact

**Code:** No changes needed

---

### **Option 2: Be Technically Correct (Optimization)**

Remove `useMemo` where it's not actually used in dependencies.

**Changes:**

#### **AuthHeader.tsx:**
```typescript
// Remove useMemo
const supabase = createClient();

useEffect(() => {
  // ... code
}, []); // ← Still empty, so no problem
```

#### **games/page.tsx:**
Fix the actual bug:
```typescript
const supabase = useMemo(() => createClient(), []);

useEffect(() => {
  supabase.auth.getUser().then(({ data: { user } }) => {
    setUser(user);
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user ?? null);
  });

  return () => subscription.unsubscribe();
}, []); // ← REMOVE supabase.auth from dependencies (it's unstable)
// eslint-disable-next-line react-hooks/exhaustive-deps
```

#### **profile/page.tsx:**
```typescript
// Keep useMemo - it's needed!
const supabase = useMemo(() => createClient(), []);

useEffect(() => {
  // ... code
}, [router, supabase]); // ← supabase is used, so useMemo is needed
```

---

## 🤔 Which Option Should You Choose?

### **I recommend Option 1: Keep It Everywhere**

**Reasons:**
1. **Consistency** - Same pattern everywhere
2. **Future-proof** - Won't break if someone adds `supabase` to a dependency
3. **Official recommendation** - Supabase docs show this pattern
4. **Minimal cost** - Creating the client with `useMemo` is essentially free
5. **Clarity** - Clear signal that "this is a Supabase client"

### **Only consider Option 2 if:**
- You're obsessed with perfect optimization
- You're willing to maintain strict lint rules
- You understand the tradeoffs

---

## 📖 The Real Bug: `supabase.auth` in Dependencies

**games/page.tsx line 84:**
```typescript
}, [supabase.auth]); // ← THIS IS THE ACTUAL BUG
```

**Problem:**
`supabase.auth` is a **getter** that returns a new object every time:
```typescript
// Every access creates a new object!
const auth1 = supabase.auth; // {}
const auth2 = supabase.auth; // {} (different object)
auth1 === auth2 // false!
```

**Fix:**
```typescript
}, []); // ← Just use empty array
// eslint-disable-next-line react-hooks/exhaustive-deps
```

The effect should only run once on mount. The subscription handles all future auth changes.

---

## 💡 Key Takeaways

### **When to use `useMemo` with Supabase:**

✅ **YES - Use it when:**
- `supabase` is in a `useEffect` dependency array
- You want consistent patterns (recommended)
- Following Supabase official docs

❌ **NO - Don't need it when:**
- `supabase` is NOT in any dependency arrays
- The component only renders once (rare)

### **General `useMemo` rules:**

✅ **Good for:**
- Expensive calculations (sorting, filtering large arrays)
- Creating objects/arrays used in dependency arrays
- Preventing child component re-renders

❌ **Bad for (premature optimization):**
- Simple calculations
- Creating lightweight objects
- "Just in case" without measuring

---

## 🎬 Summary: What You Should Do

### **Immediate Action: Fix the Bug**

**File:** `app/games/page.tsx` (Line 84)

**Change:**
```typescript
// Before (BUG - causes unnecessary re-renders)
}, [supabase.auth]);

// After (FIXED)
}, []);
// eslint-disable-next-line react-hooks/exhaustive-deps
```

### **Keep `useMemo` Everywhere Else**

It's the recommended pattern from Supabase and prevents future bugs.

---

## 📚 Further Reading

- [React useMemo docs](https://react.dev/reference/react/useMemo)
- [Supabase Next.js docs](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [When to useMemo and useCallback](https://kentcdodds.com/blog/usememo-and-usecallback)

---

**TL;DR:**
- ✅ Keep `useMemo` in profile/page.tsx (needed)
- ⚠️ Keep `useMemo` in games/page.tsx and AuthHeader.tsx (consistency)
- 🐛 Remove `supabase.auth` from dependency array in games/page.tsx (actual bug)

---

**Last Updated:** 2025-01-20
