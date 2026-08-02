# Next.js data security — condensed patterns

Canonical guide: https://nextjs.org/docs/app/guides/data-security (App Router, Next.js 16+)

Use these patterns when implementing. Prefer project conventions when they already
match this model.

## 1. Cached identity helper (DAL)

```ts
// data/auth.ts
import { cache } from "react"
import { cookies } from "next/headers"

export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies()
  const token = cookieStore.get("AUTH_TOKEN")
  const decodedToken = await decryptAndValidate(token)
  // Prefer a class so accidental full-object serialization is harder
  return new User(decodedToken.id)
})
```

## 2. Authorization + minimal DTO

```ts
// data/user-dto.ts
import "server-only"
import { getCurrentUser } from "./auth"

function canSeePhoneNumber(viewer: User, team: string) {
  return viewer.isAdmin || team === viewer.team
}

export async function getProfileDTO(slug: string) {
  const [rows] = await sql`SELECT * FROM user WHERE slug = ${slug}`
  const userData = rows[0]
  const currentUser = await getCurrentUser()

  return {
    username: userData.username,
    phonenumber: canSeePhoneNumber(currentUser, userData.team)
      ? userData.phonenumber
      : null,
  }
}
```

```tsx
// app/page.tsx — only DTOs leave the DAL
import { getProfileDTO } from "@/data/user-dto"

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const profile = await getProfileDTO(slug)
  return <Profile profile={profile} />
}
```

## 3. Bad vs good client props

```tsx
// BAD — full row to client
return <Profile user={userData} />

// GOOD — public fields only
const publicProfile = await getUserPublic(slug)
return <Profile user={publicProfile} />
```

```tsx
// Client: narrow props, not the full User model
"use client"
export function Profile({ user }: { user: { name: string } }) {
  return <h1>{user.name}</h1>
}
```

## 4. server-only module gate

```ts
// lib/data.ts or data/*.ts
import "server-only"
// database clients, secret env, crypto, internal APIs
```

## 5. React taint (optional, with DAL)

```js
// next.config.js
module.exports = {
  experimental: {
    taint: true,
  },
}
```

Use `experimental_taintObjectReference` / `experimental_taintUniqueValue` after
enabling. Still sanitize in the DAL first.

## 6. Zero Trust HTTP from RSC

```tsx
import { cookies } from "next/headers"

export default async function Page() {
  const cookieStore = await cookies()
  const token = cookieStore.get("AUTH_TOKEN")?.value

  const res = await fetch("https://api.example.com/profile", {
    headers: {
      Cookie: `AUTH_TOKEN=${token}`,
    },
  })
  // ...
}
```

## 7. Server Action: re-auth + ownership

```ts
// app/actions.ts
"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function deletePost(postId: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  const post = await db.post.findUnique({ where: { id: postId } })
  if (!post || post.authorId !== session.user.id) {
    throw new Error("Forbidden")
  }

  await db.post.delete({ where: { id: postId } })
}
```

Page-level `auth()` redirects control UI only. The action is a separate entry point.

## 8. Thin action + DAL mutation

```ts
// data/posts.ts
import "server-only"
// authn + authz + db inside deletePost()

// app/actions.ts
"use server"
import { deletePost } from "@/data/posts"
import { revalidatePath } from "next/cache"

export async function deletePostAction(postId: string) {
  await deletePost(postId)
  revalidatePath("/posts")
}
```

## 9. Control return values

```ts
// BAD
return db.user.update({ where: { id }, data })

// GOOD
await db.user.update({ where: { id }, data })
return { success: true }
```

## 10. Never mutate in render

```tsx
// BAD
if ((await searchParams).logout) {
  ;(await cookies()).delete("AUTH_TOKEN")
}

// GOOD — Server Action form
<form action={logout}>
  <button type="submit">Logout</button>
</form>
```

## 11. Never trust searchParams for auth

```tsx
// BAD
const isAdmin = (await searchParams).isAdmin === "true"

// GOOD
const isAdmin = await verifyAdmin(await getSessionToken())
```

## 12. Advanced: encryption key & origins

```bash
openssl rand -base64 32
# NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=...
```

```js
// Reverse proxy / multi-origin hosts
module.exports = {
  experimental: {
    serverActions: {
      allowedOrigins: ["my-proxy.com", "*.my-proxy.com"],
    },
  },
}
```

Confirm current config shape in Next.js docs — keys have moved between experimental
and stable across versions.
