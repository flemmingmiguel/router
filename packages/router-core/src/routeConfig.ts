import { GetFrameworkGeneric } from './frameworks'
import { ParsePathParams } from './link'
import { joinPaths, trimPath, trimPathRight } from './path'
import { RouteInfo } from './routeInfo'
import { RouteMatch } from './routeMatch'
import {
  DeepAwaited,
  Expand,
  IsAny,
  NoInfer,
  PickUnsafe,
  Values,
} from './utils'

export const rootRouteId = '__root__' as const
export type RootRouteId = typeof rootRouteId

export type AnyLoaderData = {}
export type AnyPathParams = {}
export type AnySearchSchema = {}
export interface RouteMeta {}

// The parse type here allows a zod schema to be passed directly to the validator
export type SearchSchemaValidator<TReturn, TParentSchema> =
  | SearchSchemaValidatorObj<TReturn, TParentSchema>
  | SearchSchemaValidatorFn<TReturn, TParentSchema>

export type SearchSchemaValidatorObj<TReturn, TParentSchema> = {
  parse?: SearchSchemaValidatorFn<TReturn, TParentSchema>
}

export type SearchSchemaValidatorFn<TReturn, TParentSchema> = (
  searchObj: Record<string, unknown>,
) => {} extends TParentSchema
  ? TReturn
  : keyof TReturn extends keyof TParentSchema
  ? {
      error: 'Top level search params cannot be redefined by child routes!'
      keys: keyof TReturn & keyof TParentSchema
    }
  : TReturn

export type DefinedPathParamWarning =
  'Path params cannot be redefined by child routes!'

export type ParentParams<TParentParams> = AnyPathParams extends TParentParams
  ? {}
  : {
      [Key in keyof TParentParams]?: DefinedPathParamWarning
    }

export type LoaderFn<
  TParentRouteLoaderData extends AnyLoaderData = {},
  TRouteLoaderData extends AnyLoaderData = {},
  TFullSearchSchema extends AnySearchSchema = {},
  TAllParams extends AnyPathParams = {},
> = (
  loaderContext: LoaderContext<
    TParentRouteLoaderData,
    TFullSearchSchema,
    TAllParams
  >,
) => Promise<TRouteLoaderData>

export interface LoaderContext<
  TParentRouteLoaderData extends AnyLoaderData = {},
  TFullSearchSchema extends AnySearchSchema = {},
  TAllParams extends AnyPathParams = {},
> {
  params: TAllParams
  search: TFullSearchSchema
  signal?: AbortSignal
  parentLoaderPromise?: Promise<TParentRouteLoaderData>
}

export type ActionFn<TActionPayload = unknown, TActionResponse = unknown> = (
  submission: TActionPayload,
) => TActionResponse | Promise<TActionResponse>

export type UnloaderFn<TPath extends string> = (
  routeMatch: RouteMatch<any, RouteInfo<string, TPath>>,
) => void

export type RouteOptions<
  TRouteId extends string = string,
  TPath extends string = string,
  TParentRouteLoaderData extends AnyLoaderData = {},
  TRouteLoaderData extends AnyLoaderData = {},
  TLoaderData extends AnyLoaderData = {},
  TActionPayload = unknown,
  TActionResponse = unknown,
  TParentSearchSchema extends {} = {},
  TSearchSchema extends AnySearchSchema = {},
  TFullSearchSchema extends AnySearchSchema = TSearchSchema,
  TParentParams extends AnyPathParams = {},
  TParams extends Record<ParsePathParams<TPath>, unknown> = Record<
    ParsePathParams<TPath>,
    string
  >,
  TAllParams extends AnyPathParams = {},
> = (
  | {
      // The path to match (relative to the nearest parent `Route` component or root basepath)
      path: TPath
    }
  | {
      id: TRouteId
    }
) & {
  // If true, this route will be matched as case-sensitive
  caseSensitive?: boolean
  validateSearch?: SearchSchemaValidator<TSearchSchema, TParentSearchSchema>
  // Filter functions that can manipulate search params *before* they are passed to links and navigate
  // calls that match this route.
  preSearchFilters?: SearchFilter<TFullSearchSchema>[]
  // Filter functions that can manipulate search params *after* they are passed to links and navigate
  // calls that match this route.
  postSearchFilters?: SearchFilter<TFullSearchSchema>[]
  // The content to be rendered when the route is matched. If no component is provided, defaults to `<Outlet />`
  component?: GetFrameworkGeneric<'Component'> // , NoInfer<TParentLoaderData>>
  // The content to be rendered when the route encounters an error
  errorComponent?: GetFrameworkGeneric<'Component'> // , NoInfer<TParentLoaderData>>
  // If supported by your framework, the content to be rendered as the fallback content until the route is ready to render
  pendingComponent?: GetFrameworkGeneric<'Component'> //, NoInfer<TParentLoaderData>>
  // An asynchronous function responsible for preparing or fetching data for the route before it is rendered
  loader?: LoaderFn<
    TParentRouteLoaderData,
    TRouteLoaderData,
    TFullSearchSchema,
    TAllParams
  >
  // The max age to consider loader data fresh (not-stale) for this route in milliseconds from the time of fetch
  // Defaults to 0. Only stale loader data is refetched.
  loaderMaxAge?: number
  // The max age to cache the loader data for this route in milliseconds from the time of route inactivity
  // before it is garbage collected.
  loaderGcMaxAge?: number
  // An asynchronous function made available to the route for performing asynchronous or mutative actions that
  // might invalidate the route's data.
  action?: ActionFn<TActionPayload, TActionResponse>
  // Set this to true to rethrow errors up the component tree to either the nearest error boundary or
  // route with error component, whichever comes first.
  useErrorBoundary?: boolean
  // This function is called
  // when moving from an inactive state to an active one. Likewise, when moving from
  // an active to an inactive state, the return function (if provided) is called.
  onMatch?: (matchContext: {
    params: TAllParams
    search: TFullSearchSchema
  }) =>
    | void
    | undefined
    | ((match: { params: TAllParams; search: TFullSearchSchema }) => void)
  // This function is called when the route remains active from one transition to the next.
  onTransition?: (match: {
    params: TAllParams
    search: TFullSearchSchema
  }) => void
  // An object of whatever you want! This object is accessible anywhere matches are.
  meta?: RouteMeta // TODO: Make this nested and mergeable
} & (
    | {
        parseParams?: never
        stringifyParams?: never
      }
    | {
        // Parse params optionally receives path params as strings and returns them in a parsed format (like a number or boolean)
        parseParams: (
          rawParams: IsAny<TPath, any, Record<ParsePathParams<TPath>, string>>,
        ) => TParams
        stringifyParams: (
          params: TParams,
        ) => Record<ParsePathParams<TPath>, string>
      }
  ) &
  (PickUnsafe<TParentParams, ParsePathParams<TPath>> extends never // Detect if an existing path param is being redefined
    ? {}
    : 'Cannot redefined path params in child routes!')

export type SearchFilter<T, U = T> = (prev: T) => U

export interface RouteConfig<
  TId extends string = string,
  TRouteId extends string = string,
  TPath extends string = string,
  TFullPath extends string = string,
  TParentRouteLoaderData extends AnyLoaderData = AnyLoaderData,
  TRouteLoaderData extends AnyLoaderData = AnyLoaderData,
  TLoaderData extends AnyLoaderData = AnyLoaderData,
  TActionPayload = unknown,
  TActionResponse = unknown,
  TParentSearchSchema extends {} = {},
  TSearchSchema extends AnySearchSchema = {},
  TFullSearchSchema extends AnySearchSchema = {},
  TParentParams extends AnyPathParams = {},
  TParams extends Record<ParsePathParams<TPath>, unknown> = Record<
    ParsePathParams<TPath>,
    string
  >,
  TAllParams extends AnyPathParams = {},
  TKnownChildren = unknown,
> {
  id: TId
  routeId: TRouteId
  path: NoInfer<TPath>
  fullPath: TFullPath
  options: RouteOptions<
    TRouteId,
    TPath,
    TParentRouteLoaderData,
    TRouteLoaderData,
    TLoaderData,
    TActionPayload,
    TActionResponse,
    TParentSearchSchema,
    TSearchSchema,
    TFullSearchSchema,
    TParentParams,
    TParams,
    TAllParams
  >
  children?: TKnownChildren
  addChildren: IsAny<
    TId,
    any,
    <TNewChildren extends any>(
      children: TNewChildren extends AnyRouteConfig[]
        ? TNewChildren
        : { error: 'Invalid route detected'; route: TNewChildren },
    ) => RouteConfig<
      TId,
      TRouteId,
      TPath,
      TFullPath,
      TParentRouteLoaderData,
      TRouteLoaderData,
      TLoaderData,
      TActionPayload,
      TActionResponse,
      TParentSearchSchema,
      TSearchSchema,
      TFullSearchSchema,
      TParentParams,
      TParams,
      TAllParams,
      TNewChildren
    >
  >
  createChildren: IsAny<
    TId,
    any,
    <TNewChildren extends any>(
      cb: (
        createChildRoute: CreateRouteConfigFn<
          false,
          TId,
          TFullPath,
          TRouteLoaderData,
          TLoaderData,
          TFullSearchSchema,
          TAllParams
        >,
      ) => TNewChildren extends AnyRouteConfig[]
        ? TNewChildren
        : { error: 'Invalid route detected'; route: TNewChildren },
    ) => RouteConfig<
      TId,
      TRouteId,
      TPath,
      TFullPath,
      TParentRouteLoaderData,
      TRouteLoaderData,
      TLoaderData,
      TActionPayload,
      TActionResponse,
      TParentSearchSchema,
      TSearchSchema,
      TFullSearchSchema,
      TParentParams,
      TParams,
      TAllParams,
      TNewChildren
    >
  >
  createRoute: CreateRouteConfigFn<
    false,
    TId,
    TFullPath,
    TRouteLoaderData,
    TLoaderData,
    TFullSearchSchema,
    TAllParams
  >
}

type CreateRouteConfigFn<
  TIsRoot extends boolean = false,
  TParentId extends string = string,
  TParentPath extends string = string,
  TParentRouteLoaderData extends AnyLoaderData = {},
  TParentLoaderData extends AnyLoaderData = {},
  TParentSearchSchema extends AnySearchSchema = {},
  TParentParams extends AnyPathParams = {},
> = <
  TRouteId extends string,
  TPath extends string,
  TRouteLoaderData extends AnyLoaderData,
  TActionPayload,
  TActionResponse,
  TSearchSchema extends AnySearchSchema = AnySearchSchema,
  TParams extends Record<ParsePathParams<TPath>, unknown> = Record<
    ParsePathParams<TPath>,
    string
  >,
  TAllParams extends AnyPathParams extends TParams
    ? Record<ParsePathParams<TPath>, string>
    : NoInfer<TParams> = AnyPathParams extends TParams
    ? Record<ParsePathParams<TPath>, string>
    : NoInfer<TParams>,
  TKnownChildren extends RouteConfig[] = RouteConfig[],
  TResolvedId extends string = string extends TRouteId
    ? string extends TPath
      ? string
      : TPath
    : TRouteId,
>(
  options?: TIsRoot extends true
    ? Omit<
        RouteOptions<
          TRouteId,
          TPath,
          TParentRouteLoaderData,
          TRouteLoaderData,
          Expand<TParentLoaderData & DeepAwaited<NoInfer<TRouteLoaderData>>>,
          TActionPayload,
          TActionResponse,
          TParentSearchSchema,
          TSearchSchema,
          Expand<TParentSearchSchema & TSearchSchema>,
          TParentParams,
          TParams,
          Expand<TParentParams & TAllParams>
        >,
        'path'
      > & { path?: never }
    : RouteOptions<
        TRouteId,
        TPath,
        TParentRouteLoaderData,
        TRouteLoaderData,
        Expand<TParentLoaderData & DeepAwaited<NoInfer<TRouteLoaderData>>>,
        TActionPayload,
        TActionResponse,
        TParentSearchSchema,
        TSearchSchema,
        Expand<TParentSearchSchema & TSearchSchema>,
        TParentParams,
        TParams,
        Expand<TParentParams & TAllParams>
      >,
  children?: TKnownChildren,
  isRoot?: boolean,
  parentId?: string,
  parentPath?: string,
) => RouteConfig<
  RoutePrefix<TParentId, TResolvedId>,
  TResolvedId,
  TPath,
  string extends TPath ? '' : RoutePath<RoutePrefix<TParentPath, TPath>>,
  TParentRouteLoaderData,
  TRouteLoaderData,
  Expand<TParentLoaderData & DeepAwaited<NoInfer<TRouteLoaderData>>>,
  TActionPayload,
  TActionResponse,
  TParentSearchSchema,
  TSearchSchema,
  Expand<TParentSearchSchema & TSearchSchema>,
  TParentParams,
  TParams,
  Expand<TParentParams & TAllParams>,
  TKnownChildren
>

type RoutePath<T extends string> = T extends RootRouteId
  ? '/'
  : TrimPathRight<`${T}`>

type RoutePrefix<
  TPrefix extends string,
  TId extends string,
> = string extends TId
  ? RootRouteId
  : TId extends string
  ? `${TPrefix}/${TId}` extends '/'
    ? '/'
    : `/${TrimPathLeft<`${TrimPathRight<TPrefix>}/${TrimPath<TId>}`>}`
  : never

export interface AnyRouteConfig
  extends RouteConfig<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  > {}

export interface AnyRouteConfigWithChildren<TChildren>
  extends RouteConfig<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    TChildren
  > {}

type TrimPath<T extends string> = '' extends T
  ? ''
  : TrimPathRight<TrimPathLeft<T>>

type TrimPathLeft<T extends string> = T extends `${RootRouteId}/${infer U}`
  ? TrimPathLeft<U>
  : T extends `/${infer U}`
  ? TrimPathLeft<U>
  : T
type TrimPathRight<T extends string> = T extends '/'
  ? '/'
  : T extends `${infer U}/`
  ? TrimPathRight<U>
  : T

export const createRouteConfig: CreateRouteConfigFn<true> = (
  options = {} as any,
  children,
  isRoot = true,
  parentId,
  parentPath,
) => {
  if (isRoot) {
    ;(options as any).path = rootRouteId
  }

  // Strip the root from parentIds
  if (parentId === rootRouteId) {
    parentId = ''
  }

  let path: undefined | string = isRoot ? rootRouteId : options.path

  // If the path is anything other than an index path, trim it up
  if (path && path !== '/') {
    path = trimPath(path)
  }

  const routeId = path || (options as { id?: string }).id

  let id = joinPaths([parentId, routeId])

  if (path === rootRouteId) {
    path = '/'
  }

  if (id !== rootRouteId) {
    id = joinPaths(['/', id])
  }

  const fullPath =
    id === rootRouteId ? '/' : trimPathRight(joinPaths([parentPath, path]))

  return {
    id: id as any,
    routeId: routeId as any,
    path: path as any,
    fullPath: fullPath as any,
    options: options as any,
    children,
    createChildren: (cb: any) =>
      createRouteConfig(
        options,
        cb((childOptions: any) =>
          createRouteConfig(childOptions, undefined, false, id, fullPath),
        ),
        false,
        parentId,
        parentPath,
      ),
    addChildren: (children: any) =>
      createRouteConfig(options, children, false, parentId, parentPath),
    createRoute: (childOptions: any) =>
      createRouteConfig(childOptions, undefined, false, id, fullPath) as any,
  }
}
