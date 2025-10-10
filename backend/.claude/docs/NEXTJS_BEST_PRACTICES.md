# Next.js 15 Best Practices Guide

> **Last Updated:** January 2025
> **Target Version:** Next.js 15+
> **TypeScript:** Required for all examples

---

## Table of Contents

1. [App Router vs Pages Router](#1-app-router-vs-pages-router)
2. [Server vs Client Components](#2-server-vs-client-components)
3. [Data Fetching Patterns](#3-data-fetching-patterns)
4. [Metadata API](#4-metadata-api)
5. [Image Optimization](#5-image-optimization)
6. [Performance Best Practices](#6-performance-best-practices)
7. [Server Actions](#7-server-actions)
8. [Middleware](#8-middleware)
9. [API Routes](#9-api-routes)
10. [TypeScript Integration](#10-typescript-integration)
11. [State Management](#11-state-management)
12. [Testing](#12-testing)
13. [Deployment & Production](#13-deployment--production)
14. [Common Anti-Patterns to Avoid](#14-common-anti-patterns-to-avoid)
15. [File Structure Best Practices](#15-file-structure-best-practices)

---

## 1. App Router vs Pages Router

### When to Use App Router (Default)

**✅ Use App Router for:**
- All new Next.js 15 projects
- Projects requiring Server Components
- Advanced data fetching and streaming
- Better SEO and performance optimization
- Nested layouts and loading states

**❌ Stick with Pages Router when:**
- Migrating large legacy apps (migrate incrementally)
- Team lacks App Router experience (temporary)
- Dependencies don't support Server Components

### Key Differences

```typescript
// ❌ Pages Router (legacy)
// pages/blog/[slug].tsx
export async function getServerSideProps({ params }) {
  const post = await fetchPost(params.slug)
  return { props: { post } }
}

// ✅ App Router (Next.js 15)
// app/blog/[slug]/page.tsx
export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await fetchPost(params.slug) // Direct async/await
  return <article>{post.content}</article>
}
```

### File Conventions

| File | Purpose | Example |
|------|---------|---------|
| `page.tsx` | Route UI | `/app/blog/page.tsx` → `/blog` |
| `layout.tsx` | Shared UI wrapper | `/app/blog/layout.tsx` |
| `loading.tsx` | Loading state | Suspense boundary |
| `error.tsx` | Error boundary | Catch errors |
| `not-found.tsx` | 404 UI | Custom 404 |
| `route.ts` | API endpoint | Route handlers |

---

## 2. Server vs Client Components

### Default: Server Components

**Next.js 15 makes Server Components the default.** Only add `"use client"` when necessary.

### ✅ Server Components (Default)

```typescript
// app/products/page.tsx - NO "use client" needed
import { db } from '@/lib/database'

export default async function ProductsPage() {
  const products = await db.product.findMany() // Direct DB access

  return (
    <div>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

**Benefits:**
- Zero JavaScript to client
- Direct database/API access
- Automatic code splitting
- Better SEO

### ✅ When to Use "use client"

**Client Components are required for:**

1. **Interactivity** (event handlers)
2. **Browser APIs** (localStorage, window)
3. **State hooks** (useState, useReducer)
4. **Effect hooks** (useEffect, useLayoutEffect)
5. **React Context** (useContext)
6. **Third-party libraries** using hooks

```typescript
// ❌ BAD: Unnecessary client component
'use client'

export function ProductList({ products }: { products: Product[] }) {
  return <div>{products.map(p => <div key={p.id}>{p.name}</div>)}</div>
}

// ✅ GOOD: Server component for static rendering
export function ProductList({ products }: { products: Product[] }) {
  return <div>{products.map(p => <div key={p.id}>{p.name}</div>)}</div>
}
```

```typescript
// ✅ GOOD: Client component only when needed
'use client'

export function AddToCartButton({ productId }: { productId: string }) {
  const [isAdding, setIsAdding] = useState(false)

  const handleClick = async () => {
    setIsAdding(true)
    await addToCart(productId)
    setIsAdding(false)
  }

  return <button onClick={handleClick} disabled={isAdding}>Add to Cart</button>
}
```

### Pattern: Compose Server + Client

```typescript
// app/products/page.tsx (Server Component)
import { AddToCartButton } from './AddToCartButton' // Client Component

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await db.product.findUnique({ where: { id: params.id } })

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      {/* Server Component wraps Client Component */}
      <AddToCartButton productId={product.id} />
    </div>
  )
}
```

---

## 3. Data Fetching Patterns

### Server Components: Direct Async/Await

```typescript
// ✅ BEST: Fetch directly in Server Component
export default async function PostsPage() {
  const posts = await fetch('https://api.example.com/posts', {
    next: { revalidate: 3600 } // Cache for 1 hour
  }).then(res => res.json())

  return <PostsList posts={posts} />
}
```

### Caching Strategies

```typescript
// 1. Static (default) - cached indefinitely
const data = await fetch('https://api.example.com/data')

// 2. Revalidate - ISR (Incremental Static Regeneration)
const data = await fetch('https://api.example.com/data', {
  next: { revalidate: 60 } // Revalidate every 60 seconds
})

// 3. Dynamic - no cache
const data = await fetch('https://api.example.com/data', {
  cache: 'no-store' // Always fresh
})

// 4. Force cache (explicit)
const data = await fetch('https://api.example.com/data', {
  cache: 'force-cache'
})
```

### Streaming with Suspense

```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react'
import { SlowComponent } from './SlowComponent'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Stream slow data */}
      <Suspense fallback={<Skeleton />}>
        <SlowComponent />
      </Suspense>
    </div>
  )
}

// SlowComponent.tsx (Server Component)
export async function SlowComponent() {
  const data = await fetchSlowData() // 2-3 seconds
  return <div>{data.content}</div>
}
```

### Parallel Data Fetching

```typescript
// ✅ GOOD: Parallel requests
export default async function Page() {
  const [user, posts, comments] = await Promise.all([
    fetchUser(),
    fetchPosts(),
    fetchComments()
  ])

  return <Dashboard user={user} posts={posts} comments={comments} />
}

// ❌ BAD: Sequential waterfall
export default async function Page() {
  const user = await fetchUser()
  const posts = await fetchPosts()    // Waits for user
  const comments = await fetchComments() // Waits for posts

  return <Dashboard user={user} posts={posts} comments={comments} />
}
```

### Sequential When Dependent

```typescript
// ✅ GOOD: Sequential when data depends on previous result
export default async function UserPage({ params }: { params: { id: string } }) {
  const user = await fetchUser(params.id)

  // Posts depend on user.teamId
  const posts = await fetchPostsByTeam(user.teamId)

  return <UserProfile user={user} posts={posts} />
}
```

---

## 4. Metadata API

### Static Metadata

```typescript
// app/about/page.tsx
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us | Acme Corp',
  description: 'Learn more about Acme Corporation',
  openGraph: {
    title: 'About Us',
    description: 'Learn more about Acme Corporation',
    images: ['/og-about.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Us',
    description: 'Learn more about Acme Corporation',
    images: ['/og-about.png'],
  },
}

export default function AboutPage() {
  return <div>About content</div>
}
```

### Dynamic Metadata

```typescript
// app/blog/[slug]/page.tsx
import { Metadata } from 'next'

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const post = await fetchPost(params.slug)

  return {
    title: `${post.title} | Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author.name],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
    },
  }
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await fetchPost(params.slug)
  return <article>{post.content}</article>
}
```

### Dynamic OpenGraph Images

```typescript
// app/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Blog Post'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: { slug: string } }) {
  const post = await fetchPost(params.slug)

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          fontSize: 60,
          color: 'black',
          background: 'white',
          width: '100%',
          height: '100%',
          padding: '50px 200px',
          textAlign: 'center',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {post.title}
      </div>
    ),
    { ...size }
  )
}
```

---

## 5. Image Optimization

### next/image Component

```typescript
import Image from 'next/image'

// ✅ GOOD: Optimized with proper sizing
export function ProductImage({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={800}
      height={600}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      priority={false} // Set true for LCP images
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..." // Generated blur
    />
  )
}
```

### Priority Loading (LCP)

```typescript
// ✅ GOOD: Priority for above-the-fold hero images
export function HeroSection() {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero"
      width={1920}
      height={1080}
      priority // Preload for LCP
      className="w-full h-auto"
    />
  )
}
```

### Responsive Images

```typescript
// ✅ GOOD: Responsive with fill + object-fit
export function BackgroundImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative w-full h-96">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="100vw"
      />
    </div>
  )
}
```

### External Images

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.example.com',
        port: '',
        pathname: '/images/**',
      },
    ],
  },
}

module.exports = nextConfig
```

---

## 6. Performance Best Practices

### Automatic Code Splitting

Next.js 15 automatically splits code by route. No action needed.

```typescript
// ✅ Automatically code-split by route
// app/dashboard/page.tsx
export default function DashboardPage() {
  return <div>Dashboard</div>
}
```

### Dynamic Imports (Client Components)

```typescript
// ✅ GOOD: Lazy load heavy client components
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <p>Loading chart...</p>,
  ssr: false, // Disable SSR for client-only components
})

export default function AnalyticsPage() {
  return (
    <div>
      <h1>Analytics</h1>
      <HeavyChart />
    </div>
  )
}
```

### Font Optimization

```typescript
// app/layout.tsx
import { Inter, Roboto_Mono } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto-mono',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
```

### Script Optimization

```typescript
import Script from 'next/script'

export default function Page() {
  return (
    <>
      {/* Load after page is interactive */}
      <Script src="https://example.com/analytics.js" strategy="lazyOnload" />

      {/* Load before page is interactive */}
      <Script src="https://example.com/critical.js" strategy="beforeInteractive" />

      {/* Load after hydration */}
      <Script src="https://example.com/widget.js" strategy="afterInteractive" />
    </>
  )
}
```

### Bundle Analysis

```bash
# Install
npm install @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  // Your Next.js config
})

# Run
ANALYZE=true npm run build
```

---

## 7. Server Actions

### Form Handling

```typescript
// app/actions/user.ts
'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
})

export async function createUser(formData: FormData) {
  const validatedFields = userSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  await db.user.create({
    data: validatedFields.data,
  })

  revalidatePath('/users')

  return { success: true }
}
```

```typescript
// app/users/new/page.tsx
import { createUser } from '@/app/actions/user'

export default function NewUserPage() {
  return (
    <form action={createUser}>
      <input name="name" required />
      <input name="email" type="email" required />
      <button type="submit">Create User</button>
    </form>
  )
}
```

### Progressive Enhancement

```typescript
'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { createUser } from '@/app/actions/user'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Creating...' : 'Create User'}
    </button>
  )
}

export function UserForm() {
  const [state, formAction] = useFormState(createUser, { errors: {} })

  return (
    <form action={formAction}>
      <input name="name" />
      {state.errors?.name && <p className="text-red-500">{state.errors.name}</p>}

      <input name="email" type="email" />
      {state.errors?.email && <p className="text-red-500">{state.errors.email}</p>}

      <SubmitButton />
    </form>
  )
}
```

### Error Handling

```typescript
'use server'

import { z } from 'zod'

export async function updateProfile(formData: FormData) {
  try {
    const validatedFields = profileSchema.parse({
      bio: formData.get('bio'),
    })

    await db.profile.update({
      where: { userId: await getCurrentUserId() },
      data: validatedFields,
    })

    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { errors: error.flatten().fieldErrors }
    }

    console.error('Profile update failed:', error)
    return { error: 'Failed to update profile' }
  }
}
```

---

## 8. Middleware

### Route Protection

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')

  // Protect /dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*']
}
```

### Redirects & Rewrites

```typescript
// middleware.ts
import { NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Redirect old URLs
  if (request.nextUrl.pathname === '/old-blog') {
    return NextResponse.redirect(new URL('/blog', request.url))
  }

  // Rewrite for A/B testing
  const bucket = request.cookies.get('bucket')?.value
  if (bucket === 'b' && request.nextUrl.pathname === '/') {
    return NextResponse.rewrite(new URL('/home-variant-b', request.url))
  }

  return NextResponse.next()
}
```

### Geolocation

```typescript
// middleware.ts
import { NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const country = request.geo?.country || 'US'

  const response = NextResponse.next()
  response.cookies.set('user-country', country)

  return response
}
```

---

## 9. API Routes

### Route Handlers (App Router)

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
})

// GET /api/users
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')

  const users = await db.user.findMany({
    skip: (page - 1) * 10,
    take: 10,
  })

  return NextResponse.json({ users, page })
}

// POST /api/users
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = userSchema.parse(body)

    const user = await db.user.create({
      data: validatedData,
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Dynamic Route Handlers

```typescript
// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await db.user.findUnique({
    where: { id: params.id },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json(user)
}
```

### CORS Configuration

```typescript
// app/api/public/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const data = { message: 'Public API' }

  return NextResponse.json(data, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
```

---

## 10. TypeScript Integration

### Type-Safe Params

```typescript
// app/blog/[slug]/page.tsx
type Props = {
  params: { slug: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function BlogPost({ params, searchParams }: Props) {
  const post = await fetchPost(params.slug)
  const sortOrder = searchParams.sort === 'desc' ? 'desc' : 'asc'

  return <article>{post.content}</article>
}
```

### Metadata Types

```typescript
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Welcome to our site',
}

// Dynamic metadata with proper typing
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await fetchProduct(params.id)

  return {
    title: product.name,
    description: product.description,
  }
}
```

### Layout Props Types

```typescript
// app/layout.tsx
import { ReactNode } from 'react'

type LayoutProps = {
  children: ReactNode
}

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

### API Route Types

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'

type User = {
  id: string
  name: string
  email: string
}

export async function GET(request: NextRequest): Promise<NextResponse<User[]>> {
  const users = await db.user.findMany()
  return NextResponse.json(users)
}
```

---

## 11. State Management

### Server State vs Client State

```typescript
// ✅ GOOD: Server state in Server Component
export default async function ProductsPage() {
  const products = await db.product.findMany() // Server state

  return <ProductList products={products} />
}

// ✅ GOOD: Client state in Client Component
'use client'

export function ProductList({ products }: { products: Product[] }) {
  const [filter, setFilter] = useState('all') // UI state

  const filtered = products.filter(p =>
    filter === 'all' || p.category === filter
  )

  return (
    <div>
      <select value={filter} onChange={e => setFilter(e.target.value)}>
        <option value="all">All</option>
        <option value="electronics">Electronics</option>
      </select>
      {filtered.map(p => <ProductCard key={p.id} product={p} />)}
    </div>
  )
}
```

### URL State with searchParams

```typescript
// app/products/page.tsx
type Props = {
  searchParams: { category?: string; sort?: string }
}

export default async function ProductsPage({ searchParams }: Props) {
  const products = await db.product.findMany({
    where: searchParams.category
      ? { category: searchParams.category }
      : undefined,
    orderBy: {
      price: searchParams.sort === 'price' ? 'asc' : undefined
    },
  })

  return <ProductList products={products} />
}

// Client component for filter UI
'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function ProductFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    params.set(key, value)
    router.push(`/products?${params.toString()}`)
  }

  return (
    <select onChange={e => updateFilter('category', e.target.value)}>
      <option value="">All</option>
      <option value="electronics">Electronics</option>
    </select>
  )
}
```

### When to Use Zustand/Context

```typescript
// ✅ GOOD: Zustand for global client state
// lib/store.ts
import { create } from 'zustand'

type CartStore = {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
}

export const useCartStore = create<CartStore>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  removeItem: (id) => set((state) => ({
    items: state.items.filter(i => i.id !== id)
  })),
}))

// components/AddToCartButton.tsx
'use client'

import { useCartStore } from '@/lib/store'

export function AddToCartButton({ product }: { product: Product }) {
  const addItem = useCartStore(state => state.addItem)

  return (
    <button onClick={() => addItem({ id: product.id, name: product.name })}>
      Add to Cart
    </button>
  )
}
```

### Form State Patterns

```typescript
'use client'

import { useFormState } from 'react-dom'
import { updateProfile } from '@/app/actions/profile'

export function ProfileForm({ initialData }: { initialData: Profile }) {
  const [state, formAction] = useFormState(updateProfile, {
    errors: {},
    success: false,
  })

  return (
    <form action={formAction}>
      <input name="name" defaultValue={initialData.name} />
      {state.errors?.name && <p>{state.errors.name}</p>}

      <button type="submit">Save</button>

      {state.success && <p>Profile updated!</p>}
    </form>
  )
}
```

---

## 12. Testing

### Component Testing (Server Components)

```typescript
// __tests__/ProductsPage.test.tsx
import { render, screen } from '@testing-library/react'
import ProductsPage from '@/app/products/page'

// Mock the database
jest.mock('@/lib/db', () => ({
  product: {
    findMany: jest.fn().mockResolvedValue([
      { id: '1', name: 'Product 1', price: 100 },
      { id: '2', name: 'Product 2', price: 200 },
    ]),
  },
}))

describe('ProductsPage', () => {
  it('renders products from database', async () => {
    const Component = await ProductsPage({})
    render(Component)

    expect(screen.getByText('Product 1')).toBeInTheDocument()
    expect(screen.getByText('Product 2')).toBeInTheDocument()
  })
})
```

### Client Component Testing

```typescript
// __tests__/AddToCartButton.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { AddToCartButton } from '@/components/AddToCartButton'

describe('AddToCartButton', () => {
  it('calls addToCart on click', async () => {
    const mockAdd = jest.fn()

    render(<AddToCartButton productId="123" onAdd={mockAdd} />)

    const button = screen.getByRole('button', { name: /add to cart/i })
    fireEvent.click(button)

    expect(mockAdd).toHaveBeenCalledWith('123')
  })
})
```

### Integration Testing

```typescript
// __tests__/integration/checkout.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CheckoutPage from '@/app/checkout/page'

describe('Checkout Flow', () => {
  it('completes checkout successfully', async () => {
    const Component = await CheckoutPage({})
    render(Component)

    // Fill form
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    })

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /place order/i }))

    // Assert success
    await waitFor(() => {
      expect(screen.getByText(/order confirmed/i)).toBeInTheDocument()
    })
  })
})
```

### E2E Testing with Playwright

```typescript
// e2e/checkout.spec.ts
import { test, expect } from '@playwright/test'

test('complete checkout flow', async ({ page }) => {
  await page.goto('/products')

  // Add to cart
  await page.click('text=Add to Cart')

  // Go to checkout
  await page.click('text=Checkout')

  // Fill form
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="card"]', '4242424242424242')

  // Submit
  await page.click('button:has-text("Place Order")')

  // Assert confirmation
  await expect(page.locator('text=Order Confirmed')).toBeVisible()
})
```

---

## 13. Deployment & Production

### Environment Variables

```typescript
// ✅ GOOD: Public variables (client-accessible)
// .env.local
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

// ✅ GOOD: Private variables (server-only)
DATABASE_URL=postgresql://...
API_SECRET_KEY=secret123

// Usage in client components
export function ClientComponent() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  return <div>API: {apiUrl}</div>
}

// Usage in server components
export async function ServerComponent() {
  const dbUrl = process.env.DATABASE_URL // Safe - server-only
  return <div>Connected</div>
}
```

### Build Optimization

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimization
  reactStrictMode: true,
  swcMinify: true,

  // Logging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // Experimental
  experimental: {
    optimizePackageImports: ['@/components/ui'],
  },
}

module.exports = nextConfig
```

### ISR (Incremental Static Regeneration)

```typescript
// app/blog/[slug]/page.tsx
export const revalidate = 3600 // Revalidate every hour

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await fetchPost(params.slug)
  return <article>{post.content}</article>
}

// Generate static pages at build time
export async function generateStaticParams() {
  const posts = await fetchAllPosts()

  return posts.map(post => ({
    slug: post.slug,
  }))
}
```

### Edge Runtime vs Node Runtime

```typescript
// ✅ GOOD: Edge Runtime for global performance
export const runtime = 'edge'

export async function GET(request: Request) {
  const data = await fetch('https://api.example.com/data').then(r => r.json())
  return Response.json(data)
}

// ✅ GOOD: Node Runtime for complex logic
export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = await request.json()

  // Use Node-specific APIs
  const result = await processWithNode(body)

  return Response.json(result)
}
```

---

## 14. Common Anti-Patterns to Avoid

### ❌ Using "use client" Everywhere

```typescript
// ❌ BAD: Unnecessary client component
'use client'

export function ProductList({ products }: { products: Product[] }) {
  return <div>{products.map(p => <ProductCard key={p.id} product={p} />)}</div>
}

// ✅ GOOD: Server component (default)
export function ProductList({ products }: { products: Product[] }) {
  return <div>{products.map(p => <ProductCard key={p.id} product={p} />)}</div>
}
```

### ❌ Client-Side Data Fetching

```typescript
// ❌ BAD: Client-side fetch
'use client'

export function ProductsPage() {
  const [products, setProducts] = useState([])

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(setProducts)
  }, [])

  return <div>{products.map(p => <ProductCard key={p.id} product={p} />)}</div>
}

// ✅ GOOD: Server-side fetch
export default async function ProductsPage() {
  const products = await fetch('/api/products').then(r => r.json())

  return <div>{products.map(p => <ProductCard key={p.id} product={p} />)}</div>
}
```

### ❌ Not Using Image Component

```typescript
// ❌ BAD: Regular img tag
export function ProductImage({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} />
}

// ✅ GOOD: Next.js Image component
import Image from 'next/image'

export function ProductImage({ src, alt }: { src: string; alt: string }) {
  return <Image src={src} alt={alt} width={800} height={600} />
}
```

### ❌ Blocking Rendering with Waterfalls

```typescript
// ❌ BAD: Sequential waterfall
export default async function Page() {
  const user = await fetchUser()
  const posts = await fetchPosts()    // Waits unnecessarily
  const comments = await fetchComments() // Waits unnecessarily

  return <Dashboard user={user} posts={posts} comments={comments} />
}

// ✅ GOOD: Parallel fetching
export default async function Page() {
  const [user, posts, comments] = await Promise.all([
    fetchUser(),
    fetchPosts(),
    fetchComments(),
  ])

  return <Dashboard user={user} posts={posts} comments={comments} />
}
```

### ❌ Not Implementing Error Boundaries

```typescript
// ❌ BAD: No error handling
export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await fetchProduct(params.id) // Might throw
  return <ProductDetail product={product} />
}

// ✅ GOOD: Error boundary
// app/products/[id]/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

---

## 15. File Structure Best Practices

### Recommended Structure

```
app/
├── (marketing)/              # Route group (doesn't affect URL)
│   ├── layout.tsx           # Marketing layout
│   ├── page.tsx             # Home page (/)
│   ├── about/
│   │   └── page.tsx         # /about
│   └── pricing/
│       └── page.tsx         # /pricing
│
├── (dashboard)/             # Route group
│   ├── layout.tsx           # Dashboard layout
│   ├── dashboard/
│   │   └── page.tsx         # /dashboard
│   └── settings/
│       ├── page.tsx         # /settings
│       └── profile/
│           └── page.tsx     # /settings/profile
│
├── api/                     # API routes
│   ├── users/
│   │   ├── route.ts        # /api/users
│   │   └── [id]/
│   │       └── route.ts    # /api/users/[id]
│   └── auth/
│       └── [...nextauth]/
│           └── route.ts    # /api/auth/*
│
├── _components/             # Private components (not routes)
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── ui/
│       ├── Button.tsx
│       └── Card.tsx
│
├── _lib/                    # Private utilities
│   ├── db.ts
│   ├── auth.ts
│   └── utils.ts
│
├── actions/                 # Server actions
│   ├── user.ts
│   └── post.ts
│
├── layout.tsx               # Root layout
├── loading.tsx              # Root loading
├── error.tsx                # Root error boundary
└── not-found.tsx            # Root 404
```

### Route Groups

```typescript
// app/(marketing)/layout.tsx
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </div>
  )
}

// app/(dashboard)/layout.tsx
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <DashboardSidebar />
      <main>{children}</main>
    </div>
  )
}
```

### Private Folders (Underscore Prefix)

```
app/
├── _components/    # Not a route - private components
├── _lib/           # Not a route - private utilities
└── blog/           # Route - /blog
    └── page.tsx
```

### Parallel Routes

```
app/
├── @modal/         # Parallel route slot
│   └── page.tsx
├── @sidebar/       # Parallel route slot
│   └── page.tsx
└── layout.tsx      # Uses both slots

// app/layout.tsx
export default function Layout({
  children,
  modal,
  sidebar,
}: {
  children: ReactNode
  modal: ReactNode
  sidebar: ReactNode
}) {
  return (
    <div>
      {sidebar}
      {children}
      {modal}
    </div>
  )
}
```

---

## Quick Reference

### Key Takeaways

1. **Server Components by Default** - Only use `"use client"` when necessary
2. **Fetch Directly in Server Components** - No need for getServerSideProps
3. **Streaming with Suspense** - Progressive rendering for better UX
4. **next/image for All Images** - Automatic optimization
5. **Server Actions for Forms** - Progressive enhancement built-in
6. **Metadata API for SEO** - Static or dynamic metadata
7. **Route Groups for Layouts** - Organize without affecting URLs
8. **TypeScript Everywhere** - Type-safe params, metadata, and responses
9. **Edge Runtime for Performance** - Global low-latency APIs
10. **Test Server Components** - Mock data sources, not components

### Official Resources

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [App Router Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration)
- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)

---

**Last Updated:** January 2025
**Maintained By:** Frontend Team
**Review Cycle:** Quarterly
