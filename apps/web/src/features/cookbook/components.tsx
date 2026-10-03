'use client';

import type { Me, RecipePost } from '@tastepilot/api-client';
import { formatRelativeDate } from '@tastepilot/shared';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  PageHeader,
  RecipeCard,
  RecipeGrid,
  Select,
  Skeleton,
  StarRating,
  TabPanel,
  Tabs,
  Textarea,
  toast,
} from '@tastepilot/ui';
import { ImagePlus, Info, X } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useState } from 'react';
import { QueryState } from '@/components/query-state';
import { errorMessage } from '@/lib/query-client';
import { useSession } from '@/lib/session';
import {
  useCookbook,
  useCreatePost,
  useFollow,
  useMentions,
  usePosts,
  useProfile,
  useUserRecipes,
} from './queries';

/** Renders @handles as profile links. */
export function MentionText({ text }: { text: string }) {
  const parts = text.split(/(@[a-z0-9_]{2,20})/gi);
  return (
    <>
      {parts.map((part, i) =>
        /^@[a-z0-9_]{2,20}$/i.test(part) ? (
          <Link
            key={i}
            href={`/c/${part.slice(1).toLowerCase()}`}
            className="font-medium text-brand hover:underline"
          >
            {part}
          </Link>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/** Downscale a photo in the browser so uploads stay small. */
async function toDataUrl(file: File, maxSize = 800): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = Object.assign(document.createElement('canvas'), {
    width: Math.round(bitmap.width * scale),
    height: Math.round(bitmap.height * scale),
  });
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8);
}

function PostItem({ post }: { post: RecipePost }) {
  return (
    <li className="flex gap-3 py-4">
      <Avatar name={post.author.name} color={post.author.avatarColor} size="sm" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="flex flex-wrap items-center gap-2">
          {post.author.handle ? (
            <Link href={`/c/${post.author.handle}`} className="font-medium hover:underline">
              {post.author.name}
            </Link>
          ) : (
            <span className="font-medium">{post.author.name}</span>
          )}
          <Badge tone="outline" className="capitalize">
            {post.kind}
          </Badge>
          {post.rating && <StarRating value={post.rating} />}
          <span className="text-xs text-muted-foreground">
            {formatRelativeDate(post.createdAt)}
          </span>
        </p>
        <p className="mt-1 whitespace-pre-wrap">
          <MentionText text={post.body} />
        </p>
        {post.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded data URL
          <img
            src={post.photoUrl}
            alt={`Photo from ${post.author.name}`}
            className="mt-2 max-h-64 rounded-lg border border-border"
          />
        )}
      </div>
    </li>
  );
}

function Composer({ recipeId }: { recipeId: string }) {
  const create = useCreatePost(recipeId);
  const [kind, setKind] = useState<RecipePost['kind']>('review');
  const [rating, setRating] = useState<number | null>(null);
  const [body, setBody] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (body.trim().length < 2) return setError('Write a little more.');
        if (kind === 'review' && !rating) return setError('Pick a star rating.');
        setError(null);
        create.mutate(
          { kind, rating: kind === 'review' ? rating : null, body: body.trim(), photoUrl: photo },
          {
            onSuccess: () => {
              setBody('');
              setRating(null);
              setPhoto(null);
              toast('Posted');
            },
            onError: (err) => setError(errorMessage(err)),
          },
        );
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Post a">
          <Select
            value={kind}
            onChange={(e) => setKind(e.target.value as RecipePost['kind'])}
            className="w-36"
          >
            <option value="review">Review</option>
            <option value="tip">Tip</option>
            <option value="comment">Comment</option>
          </Select>
        </Field>
        {kind === 'review' && (
          <StarRating value={rating} onChange={setRating} label="Your rating" />
        )}
      </div>
      <Field label="Your words" hint="Mention someone with @handle." error={error ?? undefined}>
        <Textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={1000}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-muted has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand">
          <ImagePlus className="size-4" aria-hidden /> {photo ? 'Change photo' : 'Add photo'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                setPhoto(await toDataUrl(file));
              } catch {
                setError('That photo couldn’t be read.');
              }
            }}
          />
        </label>
        {photo && (
          <span className="inline-flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
            <img
              src={photo}
              alt="Selected photo preview"
              className="h-10 rounded border border-border"
            />
            <Button
              size="sm"
              variant="ghost"
              aria-label="Remove photo"
              onClick={() => setPhoto(null)}
            >
              <X className="size-4" aria-hidden />
            </Button>
          </span>
        )}
        <Button type="submit" className="ml-auto" loading={create.isPending}>
          Post
        </Button>
      </div>
    </form>
  );
}

/** Reviews, tips and comments. Informational only: never changes safety. */
export function RecipePosts({ recipeId }: { recipeId: string }) {
  const posts = usePosts(recipeId);
  return (
    <Card>
      <CardHeader title="Community" description="Reviews, tips and photos from other cooks." />
      <div className="px-4 sm:px-5">
        <p className="flex gap-2 pt-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Reviews never change a recipe’s safety result. Only verified ingredient data does.
        </p>
        <div className="border-b border-border py-4">
          <Composer recipeId={recipeId} />
        </div>
        <QueryState query={posts} loading={<Skeleton className="my-4 h-20 w-full" />}>
          {(list) =>
            list.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No posts yet. Be the first.</p>
            ) : (
              <ul className="divide-y divide-border">
                {list.map((p) => (
                  <PostItem key={p.id} post={p} />
                ))}
              </ul>
            )
          }
        </QueryState>
      </div>
    </Card>
  );
}

function CookbookGrid({ filter }: { filter: 'all' | 'following' | 'mine' }) {
  const list = useCookbook(filter);
  return (
    <QueryState query={list} loading={<Skeleton className="h-60 w-full" />}>
      {(data) =>
        data.recipes.length === 0 ? (
          <EmptyState
            icon="📚"
            title={
              filter === 'mine'
                ? 'You haven’t written any recipes yet'
                : filter === 'following'
                  ? 'Nothing from people you follow yet'
                  : 'The cookbook is empty'
            }
            action={
              filter === 'mine' ? (
                <Button asChild>
                  <Link href="/create">Create a recipe</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <RecipeGrid>
            {data.recipes.map((r) => (
              <RecipeCard
                key={r.id}
                recipe={r}
                href={`/recipes/${r.id}`}
                LinkComponent={Link}
                meta={!r.published ? <Badge tone="outline">Draft</Badge> : null}
              />
            ))}
          </RecipeGrid>
        )
      }
    </QueryState>
  );
}

function MentionsList() {
  const mentions = useMentions();
  return (
    <QueryState query={mentions} loading={<Skeleton className="h-32 w-full" />}>
      {(list) =>
        list.length === 0 ? (
          <EmptyState
            title="No mentions yet"
            description="When someone @mentions you, it shows up here."
          />
        ) : (
          <Card>
            <ul className="divide-y divide-border px-4">
              {list.map((m) => (
                <li key={m.post.id} className="py-3 text-sm">
                  <p className="text-xs text-muted-foreground">
                    {m.post.author.name} mentioned you on{' '}
                    <Link
                      href={`/recipes/${m.post.recipeId}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {m.recipeTitle}
                    </Link>{' '}
                    · {formatRelativeDate(m.post.createdAt)}
                  </p>
                  <p className="mt-1">
                    <MentionText text={m.post.body} />
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        )
      }
    </QueryState>
  );
}

export function CookbookView() {
  const [tab, setTab] = useState('all');
  return (
    <>
      <PageHeader
        title="Community cookbook"
        description="Recipes shared by home cooks. Safety badges appear once you open a recipe."
        action={
          <Button asChild>
            <Link href="/create">Share a recipe</Link>
          </Button>
        }
      />
      <Tabs
        value={tab}
        onValueChange={setTab}
        label="Cookbook sections"
        tabs={[
          { value: 'all', label: 'Everyone' },
          { value: 'following', label: 'Following' },
          { value: 'mine', label: 'My recipes' },
          { value: 'mentions', label: 'Mentions' },
        ]}
      >
        <TabPanel value="all">
          <CookbookGrid filter="all" />
        </TabPanel>
        <TabPanel value="following">
          <CookbookGrid filter="following" />
        </TabPanel>
        <TabPanel value="mine">
          <CookbookGrid filter="mine" />
        </TabPanel>
        <TabPanel value="mentions">
          <MentionsList />
        </TabPanel>
      </Tabs>
    </>
  );
}

function FollowButton({ handle, me }: { handle: string; me: Me }) {
  const profile = useProfile(handle);
  const follow = useFollow(handle);
  if (!profile.data || profile.data.isMe || me.kind !== 'full') return null;
  const following = profile.data.isFollowing;
  return (
    <Button
      variant={following ? 'secondary' : 'primary'}
      aria-pressed={following}
      onClick={() =>
        follow.mutate(!following, { onError: (e) => toast('Couldn’t update', errorMessage(e)) })
      }
    >
      {following ? 'Following' : 'Follow'}
    </Button>
  );
}

/** A cook's public cookbook: shareable, readable without an account. */
export function PublicCookbookView({ handle }: { handle: string }) {
  const profile = useProfile(handle);
  const recipes = useUserRecipes(handle);
  const session = useSession();
  return (
    <QueryState
      query={profile}
      loading={<Skeleton className="h-40 w-full" />}
      errorTitle="Cook not found"
    >
      {(p) => (
        <>
          <div className="mb-8 flex flex-wrap items-center gap-4">
            <Avatar name={p.name} color={p.avatarColor} size="lg" />
            <div className="flex-1">
              <h1 className="text-2xl font-semibold">{p.name}</h1>
              <p className="text-sm text-muted-foreground">@{p.handle}</p>
              {p.bio && <p className="mt-1 text-sm">{p.bio}</p>}
              <p className="mt-1 text-xs text-muted-foreground">
                {p.followers} followers · {p.following} following
              </p>
            </div>
            {session.data?.user && <FollowButton handle={handle} me={session.data.user} />}
          </div>
          <h2 className="mb-3 text-lg font-semibold">Recipes</h2>
          <QueryState query={recipes} loading={<Skeleton className="h-40 w-full" />}>
            {(list) =>
              list.length === 0 ? (
                <EmptyState title={`${p.name.split(' ')[0]} hasn’t published any recipes yet`} />
              ) : (
                <RecipeGrid>
                  {list.map((r) => (
                    <RecipeCard
                      key={r.id}
                      recipe={r}
                      href={session.data?.user?.kind === 'full' ? `/recipes/${r.id}` : `/r/${r.id}`}
                      LinkComponent={Link}
                    />
                  ))}
                </RecipeGrid>
              )
            }
          </QueryState>
        </>
      )}
    </QueryState>
  );
}
