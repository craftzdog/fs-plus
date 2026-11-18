import { createHash } from 'crypto'
import fs from 'fs'
import type { Stats } from 'fs'
import Module, { createRequire } from 'module'
import path from 'path'

import { mkdirp } from 'mkdirp'

/** The global module search paths, which @types/node does not declare. */
const { globalPaths } = Module as typeof Module & { globalPaths: string[] }

type RimRaf = typeof import('rimraf')

type WriteOptions =
  | {
      encoding?: string | null | undefined
      mode?: number | string | undefined
      flag?: string | undefined
    }
  | string
  | null

type ListCallback = (err: Error, result: string[]) => void

type StatSyncArgs = Parameters<typeof fs.statSync>

/** Electron releases before 3.0 shipped these on their patched fs module. */
type LegacyElectronFs = typeof fs & {
  statSyncNoException?: (...args: StatSyncArgs) => Stats | false
  lstatSyncNoException?: (...args: StatSyncArgs) => Stats | false
}

/**
 * Preload the rimraf module so that it is available synchronously.
 */
export function loadRimRaf(): Promise<RimRaf> {
  if (!fsPlus.rimraf) {
    return import('rimraf').then(rimraf => (fsPlus.rimraf = rimraf))
  }
  return Promise.resolve(fsPlus.rimraf)
}

/**
 * Returns the absolute path to the home directory.
 */
export function getHomeDirectory(): string {
  const { HOME, USERPROFILE } = process.env
  // Typed as string to keep the published signature, although it is undefined
  // when the environment variable is unset.
  return (process.platform === 'win32' && !HOME ? USERPROFILE : HOME) as string
}

/**
 * Make the given path absolute by resolving it against the current
 * working directory.
 *
 * @param relativePath - The relative path. If the path is prefixed with '~',
 *   it will be expanded to the current user's home directory.
 * @returns The absolute path or the relative path if it's unable to
 *   determine its real path.
 */
export function absolute(relativePath: string): string
export function absolute(relativePath: null | undefined): null
export function absolute(relativePath: string | null | undefined): string | null {
  if (relativePath == null) {
    return null
  }

  const expandedPath = fsPlus.resolveHome(relativePath)

  try {
    return fs.realpathSync(expandedPath)
  } catch {
    return expandedPath
  }
}

/**
 * Normalize the given path treating a leading `~` segment as referring
 * to the home directory. This method does not query the filesystem.
 *
 * @param pathToNormalize - The abnormal path. If the path is prefixed
 *   with '~', it will be expanded to the current user's home directory.
 * @returns A normalized path.
 */
export function normalize(pathToNormalize: string): string
export function normalize(pathToNormalize: null | undefined): null
export function normalize(
  pathToNormalize: { toString(): string } | null | undefined
): string | null {
  if (pathToNormalize == null) {
    return null
  }

  return fsPlus.resolveHome(path.normalize(pathToNormalize.toString()))
}

function resolveHome(relativePath: string): string {
  if (relativePath === '~') {
    return fsPlus.getHomeDirectory()
  } else if (relativePath.indexOf(`~${path.sep}`) === 0) {
    return `${fsPlus.getHomeDirectory()}${relativePath.substring(1)}`
  }
  return relativePath
}

/**
 * Convert an absolute path to tilde path for Linux and macOS.
 * /Users/username/dev => ~/dev
 *
 * @param pathToTildify - The full path.
 * @returns A tildified path.
 */
export function tildify(pathToTildify: string): string {
  if (process.platform === 'win32') {
    return pathToTildify
  }

  const normalized = fsPlus.normalize(pathToTildify)
  const homeDir = fsPlus.getHomeDirectory()
  if (homeDir == null) {
    return pathToTildify
  }

  if (normalized === homeDir) {
    return '~'
  }
  if (!normalized.startsWith(path.join(homeDir, path.sep))) {
    return pathToTildify
  }

  return path.join('~', path.sep, normalized.substring(homeDir.length + 1))
}

/**
 * Get path to store application specific data.
 *
 * - Mac: `~/Library/Application Support/`
 * - Win: `%AppData%`
 * - Linux: `/var/lib`
 *
 * @returns The absolute path or null if platform isn't supported.
 */
export function getAppDataDirectory(): string | null {
  switch (process.platform) {
    case 'darwin':
      return fsPlus.absolute(path.join('~', 'Library', 'Application Support'))
    case 'linux':
      return '/var/lib'
    case 'win32':
      // Typed as string to keep the published signature, although it is
      // undefined when the environment variable is unset.
      return process.env.APPDATA as string
    default:
      return null
  }
}

/**
 * Is the given path absolute?
 *
 * @param pathToCheck - The relative or absolute path to check.
 * @returns True if the path is absolute, false otherwise.
 */
export function isAbsolute(pathToCheck?: string): boolean {
  const checkedPath = pathToCheck ?? ''
  if (process.platform === 'win32') {
    const isDriveStyle = checkedPath[1] === ':'
    const isServerShareStyle = checkedPath[0] === '\\' && checkedPath[1] === '\\'
    return isDriveStyle || isServerShareStyle
  }
  return checkedPath[0] === '/'
}

/**
 * Returns true if a file or folder at the specified path exists.
 */
export function existsSync(pathToCheck: string): boolean {
  return isPathValid(pathToCheck) && statSyncNoException(pathToCheck) !== false
}

/**
 * Returns true if the given path exists and is a directory.
 */
export function isDirectorySync(directoryPath: string): boolean {
  if (!isPathValid(directoryPath)) {
    return false
  }
  const stat = statSyncNoException(directoryPath)
  return stat ? stat.isDirectory() : false
}

/**
 * Asynchronously checks that the given path exists and is a directory.
 *
 * @param directoryPath - The path to check.
 * @param done - Called with true if the path is a directory.
 */
export function isDirectory(directoryPath: string, done: (result: boolean) => void): void {
  if (!isPathValid(directoryPath)) {
    done(false)
    return
  }
  fs.stat(directoryPath, (error, stat) => {
    done(error == null && stat.isDirectory())
  })
}

/**
 * Returns true if the specified path exists and is a file.
 */
export function isFileSync(filePath: string): boolean {
  if (!isPathValid(filePath)) {
    return false
  }
  const stat = statSyncNoException(filePath)
  return stat ? stat.isFile() : false
}

/**
 * Returns true if the specified path is a symbolic link.
 */
export function isSymbolicLinkSync(symlinkPath: string): boolean {
  if (!isPathValid(symlinkPath)) {
    return false
  }
  const stat = lstatSyncNoException(symlinkPath)
  return stat ? stat.isSymbolicLink() : false
}

/**
 * Calls back with true if the specified path is a symbolic link.
 */
export function isSymbolicLink(symlinkPath: string, callback: (result: boolean) => void): void {
  if (isPathValid(symlinkPath)) {
    fs.lstat(symlinkPath, (_error, stat) => callback?.(stat != null && stat.isSymbolicLink()))
  } else {
    process.nextTick(() => callback?.(false))
  }
}

/**
 * Returns true if the specified path is executable.
 */
export function isExecutableSync(pathToCheck: string): boolean {
  if (!isPathValid(pathToCheck)) {
    return false
  }
  const stat = statSyncNoException(pathToCheck)
  return stat ? (stat.mode & 0o777 & 1) !== 0 : false
}

/**
 * Returns the size of the specified path, or -1 if it doesn't exist.
 */
export function getSizeSync(pathToCheck: string): number {
  if (!isPathValid(pathToCheck)) {
    return -1
  }
  const stat = statSyncNoException(pathToCheck)
  return stat ? stat.size : -1
}

/**
 * Returns an Array with the paths of the files and directories
 * contained within the directory path. It is not recursive.
 *
 * @param rootPath - The absolute path to the directory to list.
 * @param extensions - Extensions to filter the results by.
 *   If none are given, none are filtered.
 */
export function listSync(rootPath: string, extensions?: string[]): string[] {
  if (!fsPlus.isDirectorySync(rootPath)) {
    return []
  }
  return toSortedChildPaths(rootPath, fs.readdirSync(rootPath), extensions)
}

/**
 * Asynchronously lists the files and directories in the given path.
 * The listing is not recursive.
 *
 * @param rootPath - The absolute path to the directory to list.
 * @param extensions - Extensions to filter the results by.
 *   If none are given, none are filtered.
 * @param callback - The function to call.
 */
export function list(rootPath: string, callback: ListCallback): void
export function list(rootPath: string, extensions: string[], callback: ListCallback): void
export function list(rootPath: string, ...rest: [ListCallback] | [string[], ListCallback]): void {
  const extensions = rest.length > 1 ? (rest[0] as string[]) : undefined
  // The published callback type promises both arguments, but only one of
  // them is ever set.
  const done = rest.at(-1) as (error: Error | null, paths?: string[]) => void
  fs.readdir(rootPath, (error, childNames) => {
    if (error != null) {
      done(error)
    } else {
      done(null, toSortedChildPaths(rootPath, childNames, extensions))
    }
  })
}

/**
 * Returns only the paths which end with one of the given extensions.
 */
export function filterExtensions(paths: string[], extensions: string[]): string[] {
  const dottedExtensions = extensions.map(extension =>
    extension === '' ? extension : '.' + extension.replace(/^\./, '')
  )
  return paths.filter(pathToCheck => dottedExtensions.includes(path.extname(pathToCheck)))
}

/**
 * Get all paths under the given path.
 *
 * @param rootPath - The path to start at.
 */
export function listTreeSync(rootPath: string): string[] {
  const paths: string[] = []
  const onPath = (childPath: string): boolean => {
    paths.push(childPath)
    return true
  }
  fsPlus.traverseTreeSync(rootPath, onPath, onPath)
  return paths
}

/**
 * Moves the source file or directory to the target asynchronously.
 *
 * @param callback - Called with an error if the move failed. The error has
 *   the code `EEXIST` if the target already exists.
 */
export function move(source: string, target: string, callback: (err: Error) => void): void {
  // The published callback type promises an error, but none is passed on
  // success.
  const done = callback as (error?: NodeJS.ErrnoException | null) => void

  isMoveTargetValid(source, target, (statError, isTargetValid) => {
    if (statError) {
      done(statError)
      return
    }

    if (!isTargetValid) {
      done(createAlreadyExistsError(target))
      return
    }

    const targetParentPath = path.dirname(target)
    fs.exists(targetParentPath, targetParentExists => {
      if (targetParentExists) {
        fs.rename(source, target, done)
        return
      }

      fsPlus.makeTree(targetParentPath, makeTreeError => {
        if (makeTreeError) {
          done(makeTreeError)
          return
        }

        fs.rename(source, target, done)
      })
    })
  })
}

/**
 * Moves the source file or directory to the target synchronously.
 *
 * @throws An error with the code `EEXIST` if the target already exists.
 */
export function moveSync(source: string, target: string): void {
  if (!isMoveTargetValidSync(source, target)) {
    throw createAlreadyExistsError(target)
  }

  const targetParentPath = path.dirname(target)
  if (!fs.existsSync(targetParentPath)) {
    fsPlus.makeTreeSync(targetParentPath)
  }
  fs.renameSync(source, target)
}

/**
 * Removes the file or directory at the given path synchronously.
 *
 * @throws If {@link loadRimRaf} has not finished beforehand.
 */
export function removeSync(pathToRemove: string): void {
  if (!fsPlus.rimraf) {
    throw new Error('RimRaf is not loaded. You have to call `fs.loadRimRaf()` beforehand.')
  }
  fsPlus.rimraf.rimrafSync(pathToRemove)
}

/**
 * Removes the file or directory at the given path asynchronously.
 */
export function remove(pathToRemove: string, callback: (err: Error) => void): void {
  // On success the callback receives rimraf's boolean result as its argument.
  const done = callback as (result: unknown) => void
  fsPlus
    .loadRimRaf()
    .then(({ rimraf }) => rimraf(pathToRemove))
    .then(done, done)
}

/**
 * Open, write, flush, and close a file, writing the given content
 * synchronously. It also creates the necessary parent directories.
 */
export function writeFileSync(
  filePath: string,
  content: string | Buffer,
  options?: WriteOptions
): void {
  mkdirp.sync(path.dirname(filePath))
  fs.writeFileSync(filePath, content, options as fs.WriteFileOptions)
}

/**
 * Open, write, flush, and close a file, writing the given content
 * asynchronously. It also creates the necessary parent directories.
 */
export function writeFile(
  filePath: string,
  content: string | Buffer,
  callback: (err: any) => void
): void
export function writeFile(
  filePath: string,
  content: string | Buffer,
  options: WriteOptions | undefined,
  callback: (err: any) => void
): void
export function writeFile(
  filePath: string,
  content: string | Buffer,
  ...rest: [(err: any) => void] | [WriteOptions | undefined, (err: any) => void]
): void {
  const options = rest.length > 1 ? (rest[0] as WriteOptions) : undefined
  const callback = rest.at(-1) as (err: any) => void
  mkdirp(path.dirname(filePath)).then(
    () => {
      fs.writeFile(filePath, content, options as fs.WriteFileOptions, callback)
    },
    error => {
      callback?.(error)
    }
  )
}

/**
 * Copies the given file asynchronously.
 */
export function copy(sourcePath: string, destinationPath: string, done: (err: any) => void): void {
  let pendingDone: ((error?: unknown) => void) | null = done
  const finish = (error?: unknown): void => {
    pendingDone?.(error)
    pendingDone = null
  }

  mkdirp(path.dirname(destinationPath)).then(() => {
    const sourceStream = fs.createReadStream(sourcePath)
    sourceStream.on('error', finish)

    const destinationStream = fs.createWriteStream(destinationPath)
    destinationStream.on('error', finish)
    destinationStream.on('close', () => finish())

    sourceStream.pipe(destinationStream)
  }, finish)
}

/**
 * Copies the given path recursively and synchronously.
 */
export function copySync(sourcePath: string, destinationPath: string): void {
  // We need to save the sources before creaing the new directory to avoid
  // infinitely creating copies of the directory when copying inside itself
  const sources = fs.readdirSync(sourcePath)
  mkdirp.sync(destinationPath)
  for (const source of sources) {
    const sourceFilePath = path.join(sourcePath, source)
    const destinationFilePath = path.join(destinationPath, source)

    if (fsPlus.isDirectorySync(sourceFilePath)) {
      fsPlus.copySync(sourceFilePath, destinationFilePath)
    } else {
      fsPlus.copyFileSync(sourceFilePath, destinationFilePath)
    }
  }
}

const DEFAULT_COPY_BUFFER_SIZE = 16 * 1024

/**
 * Copies the given path synchronously, buffering reads and writes to
 * keep memory footprint to a minimum. If the destination directory doesn't
 * exist, it creates it.
 *
 * @param sourceFilePath - The file path you want to copy.
 * @param destinationFilePath - The file path where the file will be copied.
 * @param bufferSize - The size in bytes of the buffer when reading from
 *   and writing to disk. Defaults to 16KB.
 */
export function copyFileSync(
  sourceFilePath: string,
  destinationFilePath: string,
  bufferSize?: number
): void {
  const chunkSize = bufferSize ?? DEFAULT_COPY_BUFFER_SIZE
  mkdirp.sync(path.dirname(destinationFilePath))

  let readFd: number | null = null
  let writeFd: number | null = null
  try {
    readFd = fs.openSync(sourceFilePath, 'r')
    writeFd = fs.openSync(destinationFilePath, 'w')
    let bytesRead = 1
    let position = 0
    while (bytesRead > 0) {
      const buffer = Buffer.alloc(chunkSize)
      bytesRead = fs.readSync(readFd, buffer, 0, buffer.length, position)
      fs.writeSync(writeFd, buffer, 0, bytesRead, position)
      position += bytesRead
    }
  } finally {
    if (readFd != null) {
      fs.closeSync(readFd)
    }
    if (writeFd != null) {
      fs.closeSync(writeFd)
    }
  }
}

/**
 * Create a directory at the specified path including any missing
 * parent directories synchronously.
 */
export function makeTreeSync(directoryPath: string): void {
  if (!fsPlus.isDirectorySync(directoryPath)) {
    mkdirp.sync(directoryPath)
  }
}

/**
 * Create a directory at the specified path including any missing
 * parent directories asynchronously.
 */
export function makeTree(directoryPath: string, callback?: (err: any) => void): void {
  fsPlus.isDirectory(directoryPath, exists => {
    if (exists) {
      // Called without an argument, so the error is undefined here and null
      // after a directory was created.
      ;(callback as (() => void) | undefined)?.()
      return
    }
    mkdirp(directoryPath).then(
      () => callback?.(null),
      error => callback?.(error)
    )
  })
}

/**
 * Recursively walk the given path and execute the given functions
 * synchronously.
 *
 * @param rootPath - The directory to recurse into.
 * @param onFile - The function to execute on each file,
 *   receives the absolute path.
 * @param onDirectory - The function to execute on each directory,
 *   receives the absolute path. If this function returns a falsy value
 *   then the directory is not entered. Defaults to onFile.
 */
export function traverseTreeSync(
  rootPath: string,
  onFile: (file: string) => void,
  onDirectory?: (dir: string) => boolean | void
): void {
  const shouldEnterDirectory: (dir: string) => boolean | void = onDirectory ?? onFile
  if (!fsPlus.isDirectorySync(rootPath)) {
    return
  }

  const traverse = (directoryPath: string): void => {
    for (const file of fs.readdirSync(directoryPath)) {
      const childPath = path.join(directoryPath, file)
      const linkStats = fs.lstatSync(childPath)
      const stats = (linkStats.isSymbolicLink() && statSyncNoException(childPath)) || linkStats
      if (stats.isDirectory()) {
        if (shouldEnterDirectory(childPath)) {
          traverse(childPath)
        }
      } else if (stats.isFile()) {
        onFile(childPath)
      }
    }
  }

  traverse(rootPath)
}

/**
 * Recursively walk the given path and execute the given functions
 * asynchronously.
 *
 * @param rootPath - The directory to recurse into.
 * @param onFile - The function to execute on each file,
 *   receives the absolute path.
 * @param onDirectory - The function to execute on each directory,
 *   receives the absolute path.
 * @param onDone - Called when traversal is complete.
 */
export function traverseTree(
  rootPath: string,
  onFile: (file: string) => void,
  onDirectory: (dir: string) => boolean | void,
  onDone?: () => void
): void {
  const processChild = (childPath: string, callback: () => void): void => {
    fs.stat(childPath, (error, stats) => {
      if (error) {
        callback()
      } else if (stats.isFile()) {
        onFile(childPath)
        callback()
      } else if (stats.isDirectory() && onDirectory(childPath)) {
        fs.readdir(childPath, (readdirError, files) => {
          if (readdirError) {
            callback()
            return
          }
          processChildren(
            files.map(file => path.join(childPath, file)),
            callback
          )
        })
      } else {
        callback()
      }
    })
  }

  const processChildren = (children: string[], callback: () => void): void => {
    let nextChildIndex = 0
    const next = (): void => {
      if (nextChildIndex >= children.length) {
        callback()
        return
      }
      processChild(children[nextChildIndex++], next)
    }
    next()
  }

  fs.readdir(rootPath, (error, files) => {
    if (error) {
      onDone?.()
      return
    }
    processChildren(
      files.map(file => path.join(rootPath, file)),
      () => onDone?.()
    )
  })
}

/**
 * Hashes the contents of the given file.
 *
 * @param pathToDigest - The absolute path.
 * @returns The MD5 hexadecimal hash.
 */
export function md5ForPath(pathToDigest: string): string {
  const contents = fs.readFileSync(pathToDigest)
  return createHash('md5').update(contents).digest('hex')
}

/**
 * Finds a relative path among the given array of paths.
 *
 * @param loadPaths - Absolute and relative paths to search.
 * @param pathToResolve - The path to resolve.
 * @param extensions - Extensions to pass to {@link resolveExtension},
 *   in which case pathToResolve should not contain an extension.
 * @returns The absolute path of the file if found, undefined otherwise.
 */
export function resolve(
  ...args: [...loadPaths: string[], pathToResolve: string]
): string | undefined
export function resolve(
  ...args: [...loadPaths: string[], pathToResolve: string, extensions: string[]]
): string | undefined
export function resolve(...args: (string | string[])[]): string | undefined {
  const lastArg = args.at(-1)
  const extensions = Array.isArray(lastArg) ? lastArg : undefined
  const pathArgs = (extensions ? args.slice(0, -1) : args) as string[]
  const pathToResolve = pathArgs.at(-1)?.toString()
  const loadPaths = pathArgs.slice(0, -1)

  if (!pathToResolve) {
    return undefined
  }

  if (fsPlus.isAbsolute(pathToResolve)) {
    const resolvedPath = extensions && fsPlus.resolveExtension(pathToResolve, extensions)
    if (resolvedPath) {
      return resolvedPath
    }
    if (fsPlus.existsSync(pathToResolve)) {
      return pathToResolve
    }
  }

  for (const loadPath of loadPaths) {
    const candidatePath = path.join(loadPath, pathToResolve)
    if (extensions) {
      const resolvedPath = fsPlus.resolveExtension(candidatePath, extensions)
      if (resolvedPath) {
        return resolvedPath
      }
    } else if (fsPlus.existsSync(candidatePath)) {
      return fsPlus.absolute(candidatePath)
    }
  }
  return undefined
}

/**
 * Like {@link resolve} but uses node's module paths as the load paths to search.
 *
 * @param pathToResolve - The path to resolve.
 * @param extensions - Extensions to try.
 * @returns The absolute path of the file if found, undefined otherwise.
 */
export function resolveOnLoadPath(
  pathToResolve: string,
  extensions?: string[]
): string | undefined {
  const loadPaths = globalPaths.concat(getModulePaths())
  return extensions
    ? fsPlus.resolve(...loadPaths, pathToResolve, extensions)
    : fsPlus.resolve(...loadPaths, pathToResolve)
}

/**
 * Finds the first file in the given path which matches the extension
 * in the order given.
 *
 * @param pathToResolve - The relative or absolute path of the file
 *   in question without the extension or '.'.
 * @param extensions - The ordered extensions to try.
 * @returns The absolute path of the file if it exists with any of the
 *   given extensions, undefined otherwise.
 */
export function resolveExtension(pathToResolve: string, extensions: string[]): string | undefined {
  for (const extension of extensions) {
    const candidatePath =
      extension === '' ? pathToResolve : pathToResolve + '.' + extension.replace(/^\./, '')
    if (fsPlus.existsSync(candidatePath)) {
      return fsPlus.absolute(candidatePath)
    }
  }
  return undefined
}

/**
 * Returns true for extensions associated with compressed files.
 */
export function isCompressedExtension(ext: string): boolean {
  return ext != null && Object.hasOwn(COMPRESSED_EXTENSIONS, ext.toLowerCase())
}

/**
 * Returns true for extensions associated with image files.
 */
export function isImageExtension(ext: string): boolean {
  return ext != null && Object.hasOwn(IMAGE_EXTENSIONS, ext.toLowerCase())
}

/**
 * Returns true for extensions associated with PDF files.
 */
export function isPdfExtension(ext: string): boolean {
  return ext?.toLowerCase() === '.pdf'
}

/**
 * Returns true for extensions associated with binary files.
 */
export function isBinaryExtension(ext: string): boolean {
  return ext != null && Object.hasOwn(BINARY_EXTENSIONS, ext.toLowerCase())
}

/**
 * Returns true for files named similarly to 'README'.
 */
export function isReadmePath(readmePath: string): boolean {
  const extension = path.extname(readmePath)
  const base = path.basename(readmePath, extension).toLowerCase()
  return base === 'readme' && (extension === '' || fsPlus.isMarkdownExtension(extension))
}

/**
 * Returns true for extensions associated with Markdown files.
 */
export function isMarkdownExtension(ext: string): boolean {
  return ext != null && Object.hasOwn(MARKDOWN_EXTENSIONS, ext.toLowerCase())
}

/**
 * Is the filesystem case insensitive?
 *
 * @returns True if case insensitive, false otherwise.
 */
export function isCaseInsensitive(): boolean {
  if (fsPlus.caseInsensitiveFs == null) {
    const lowerCaseStat = statSyncNoException(process.execPath.toLowerCase())
    const upperCaseStat = statSyncNoException(process.execPath.toUpperCase())
    fsPlus.caseInsensitiveFs =
      lowerCaseStat !== false &&
      upperCaseStat !== false &&
      lowerCaseStat.dev === upperCaseStat.dev &&
      lowerCaseStat.ino === upperCaseStat.ino
  }

  return fsPlus.caseInsensitiveFs
}

/**
 * Is the filesystem case sensitive?
 *
 * @returns True if case sensitive, false otherwise.
 */
export function isCaseSensitive(): boolean {
  return !fsPlus.isCaseInsensitive()
}

/**
 * Calls `fs.statSync`, catching all exceptions raised. This method calls
 * `fs.statSyncNoException` when provided by the underlying `fs` module
 * (Electron < 3.0).
 *
 * @returns The stats if the file exists, false otherwise.
 */
export function statSyncNoException(...args: StatSyncArgs): Stats | false {
  const legacyFs: LegacyElectronFs = fs
  if (legacyFs.statSyncNoException && checkIfElectron2OrLower()) {
    return legacyFs.statSyncNoException(...args)
  }
  try {
    return fs.statSync(...args) as Stats
  } catch {
    return false
  }
}

/**
 * Calls `fs.lstatSync`, catching all exceptions raised. This method calls
 * `fs.lstatSyncNoException` when provided by the underlying `fs` module
 * (Electron < 3.0).
 *
 * @returns The stats if the file exists, false otherwise.
 */
export function lstatSyncNoException(...args: StatSyncArgs): Stats | false {
  const legacyFs: LegacyElectronFs = fs
  if (legacyFs.lstatSyncNoException && checkIfElectron2OrLower()) {
    return legacyFs.lstatSyncNoException(...args)
  }
  try {
    return fs.lstatSync(...args) as Stats
  } catch {
    return false
  }
}

// Built-in [l]statSyncNoException methods are only provided in Electron releases
// before 3.0.  We delay the version check until first request so that Electron
// application snapshots can be generated successfully.
let isElectron2OrLower: boolean | null = null
function checkIfElectron2OrLower(): boolean {
  if (isElectron2OrLower === null) {
    const electronVersion = process.versions.electron
    isElectron2OrLower = electronVersion != null && parseInt(electronVersion.split('.')[0]) <= 2
  }
  return isElectron2OrLower
}

const BINARY_EXTENSIONS: Record<string, true> = {
  '.ds_store': true,
  '.a': true,
  '.exe': true,
  '.o': true,
  '.pyc': true,
  '.pyo': true,
  '.so': true,
  '.woff': true
}

const COMPRESSED_EXTENSIONS: Record<string, true> = {
  '.bz2': true,
  '.egg': true,
  '.epub': true,
  '.gem': true,
  '.gz': true,
  '.jar': true,
  '.lz': true,
  '.lzma': true,
  '.lzo': true,
  '.rar': true,
  '.tar': true,
  '.tgz': true,
  '.war': true,
  '.whl': true,
  '.xpi': true,
  '.xz': true,
  '.z': true,
  '.zip': true
}

const IMAGE_EXTENSIONS: Record<string, true> = {
  '.gif': true,
  '.ico': true,
  '.jpeg': true,
  '.jpg': true,
  '.png': true,
  '.tif': true,
  '.tiff': true,
  '.webp': true
}

const MARKDOWN_EXTENSIONS: Record<string, true> = {
  '.markdown': true,
  '.md': true,
  '.mdown': true,
  '.mkd': true,
  '.mkdown': true,
  '.rmd': true,
  '.ron': true
}

function isPathValid(pathToCheck: unknown): pathToCheck is string {
  return typeof pathToCheck === 'string' && pathToCheck.length > 0
}

function toSortedChildPaths(
  rootPath: string,
  childNames: string[],
  extensions: string[] | undefined
): string[] {
  const listedNames = extensions ? fsPlus.filterExtensions(childNames, extensions) : childNames
  return listedNames
    .toSorted((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map(childName => path.join(rootPath, childName))
}

function createAlreadyExistsError(target: string): NodeJS.ErrnoException {
  return Object.assign(new Error(`'${target}' already exists.`), {
    code: 'EEXIST'
  })
}

/**
 * Returns the node_modules directories node would search from this module,
 * i.e. what `module.paths` held in the CommonJS build.
 */
function getModulePaths(): string[] {
  try {
    const lookupPaths = createRequire(import.meta.url).resolve.paths('fs-plus') ?? []
    return lookupPaths.filter(lookupPath => !globalPaths.includes(lookupPath))
  } catch {
    // createRequire throws when this module is bundled and served from a
    // non-file URL, where there are no module paths to derive.
    const { resourcesPath } = process as NodeJS.Process & {
      resourcesPath?: string
    }
    return resourcesPath ? [path.join(resourcesPath, 'app', 'node_modules')] : []
  }
}

function isMoveTargetValid(
  source: string,
  target: string,
  callback: (error: NodeJS.ErrnoException | undefined, isTargetValid?: boolean) => void
): void {
  fs.stat(source, (oldErr, oldStat) => {
    if (oldErr) {
      callback(oldErr)
      return
    }

    fs.stat(target, (newErr, newStat) => {
      if (newErr && newErr.code === 'ENOENT') {
        callback(undefined, true) // new path does not exist so it is valid
        return
      }

      // New path exists so check if it points to the same file as the initial
      // path to see if the case of the file name is being changed on a case
      // insensitive filesystem.
      callback(
        undefined,
        source.toLowerCase() === target.toLowerCase() &&
          oldStat.dev === newStat.dev &&
          oldStat.ino === newStat.ino
      )
    })
  })
}

function isMoveTargetValidSync(source: string, target: string): boolean {
  const oldStat = statSyncNoException(source)
  const newStat = statSyncNoException(target)

  if (!oldStat || !newStat) {
    return true
  }

  // New path exists so check if it points to the same file as the initial
  // path to see if the case of the file name is being changed on a case
  // insensitive filesystem.
  return (
    source.toLowerCase() === target.toLowerCase() &&
    oldStat.dev === newStat.dev &&
    oldStat.ino === newStat.ino
  )
}

/**
 * Useful extensions to node's built-in fs module.
 *
 * The helpers call each other through this object, so a helper reassigned on
 * the default export is picked up by the others.
 */
const fsPlus = {
  rimraf: null as RimRaf | null,
  caseInsensitiveFs: null as boolean | null,
  loadRimRaf,
  getHomeDirectory,
  absolute,
  normalize,
  resolveHome,
  tildify,
  getAppDataDirectory,
  isAbsolute,
  existsSync,
  isDirectorySync,
  isDirectory,
  isFileSync,
  isSymbolicLinkSync,
  isSymbolicLink,
  isExecutableSync,
  getSizeSync,
  listSync,
  list,
  filterExtensions,
  listTreeSync,
  move,
  moveSync,
  removeSync,
  remove,
  writeFileSync,
  writeFile,
  copy,
  copySync,
  copyFileSync,
  makeTreeSync,
  makeTree,
  traverseTreeSync,
  traverseTree,
  md5ForPath,
  resolve,
  resolveOnLoadPath,
  resolveExtension,
  isCompressedExtension,
  isImageExtension,
  isPdfExtension,
  isBinaryExtension,
  isReadmePath,
  isMarkdownExtension,
  isCaseInsensitive,
  isCaseSensitive,
  statSyncNoException,
  lstatSyncNoException
}

type FsPlusHelpers = typeof fsPlus

/**
 * Node's fs module extended with the fs-plus helpers. Properties are looked up
 * on node's fs at access time and helpers can be reassigned, unlike the
 * named exports.
 */
const fsPlusWithNodeFs: Omit<typeof fs, keyof FsPlusHelpers> & FsPlusHelpers = new Proxy(
  {} as Omit<typeof fs, keyof FsPlusHelpers> & FsPlusHelpers,
  {
    get(_target, key) {
      return Object.hasOwn(fsPlus, key) ? Reflect.get(fsPlus, key) : Reflect.get(fs, key)
    },

    set(_target, key, value) {
      return Reflect.set(fsPlus, key, value)
    }
  }
)

export default fsPlusWithNodeFs

export * from 'fs'
