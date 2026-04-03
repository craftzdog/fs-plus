/// <reference types="node" />

import { Stats } from "fs";

export * from "fs";

/**
 * Preload the rimraf module so that it is available synchronously.
 */
export function loadRimRaf(): Promise<typeof import("rimraf")>;

/**
 * Returns the absolute path to the home directory.
 */
export function getHomeDirectory(): string;

/**
 * Make the given path absolute by resolving it against the current
 * working directory.
 *
 * @param relativePath - The relative path. If the path is prefixed with '~',
 *   it will be expanded to the current user's home directory.
 * @returns The absolute path or the relative path if it's unable to
 *   determine its real path.
 */
export function absolute(relativePath: string): string;

/**
 * Normalize the given path treating a leading `~` segment as referring
 * to the home directory. This method does not query the filesystem.
 *
 * @param pathToNormalize - The abnormal path. If the path is prefixed
 *   with '~', it will be expanded to the current user's home directory.
 * @returns A normalized path.
 */
export function normalize(pathToNormalize: string): string;

/**
 * Convert an absolute path to tilde path for Linux and macOS.
 * /Users/username/dev => ~/dev
 *
 * @param pathToTildify - The full path.
 * @returns A tildified path.
 */
export function tildify(pathToTildify: string): string;

/**
 * Get path to store application specific data.
 *
 * - Mac: `~/Library/Application Support/`
 * - Win: `%AppData%`
 * - Linux: `/var/lib`
 *
 * @returns The absolute path or null if platform isn't supported.
 */
export function getAppDataDirectory(): string | null;

/**
 * Is the given path absolute?
 *
 * @param pathToCheck - The relative or absolute path to check.
 * @returns True if the path is absolute, false otherwise.
 */
export function isAbsolute(pathToCheck?: string): boolean;

/**
 * Returns true if a file or folder at the specified path exists.
 *
 * @param pathToCheck
 */
export function existsSync(pathToCheck: string): boolean;

/**
 * Returns true if the given path exists and is a directory.
 *
 * @param directoryPath
 */
export function isDirectorySync(directoryPath: string): boolean;

/**
 * Asynchronously checks that the given path exists and is a directory.
 *
 * @param directoryPath
 * @param done
 */
export function isDirectory(
  directoryPath: string,
  done: (result: boolean) => void
): void;

/**
 * Returns true if the specified path exists and is a file.
 *
 * @param filePath
 */
export function isFileSync(filePath: string): boolean;

/**
 * Returns true if the specified path is a symbolic link.
 *
 * @param symlinkPath
 */
export function isSymbolicLinkSync(symlinkPath: string): boolean;

/**
 * Calls back with true if the specified path is a symbolic link.
 *
 * @param symlinkPath
 * @param callback
 */
export function isSymbolicLink(
  symlinkPath: string,
  callback: (result: boolean) => void
): void;

/**
 * Returns true if the specified path is executable.
 *
 * @param pathToCheck
 */
export function isExecutableSync(pathToCheck: string): boolean;

/**
 * Returns the size of the specified path.
 *
 * @param pathToCheck
 */
export function getSizeSync(pathToCheck: string): number;

/**
 * Returns an Array with the paths of the files and directories
 * contained within the directory path. It is not recursive.
 *
 * @param rootPath - The absolute path to the directory to list.
 * @param extensions - Extensions to filter the results by.
 *   If none are given, none are filtered.
 */
export function listSync(rootPath: string, extensions?: string[]): string[];

/**
 * Asynchronously lists the files and directories in the given path.
 * The listing is not recursive.
 *
 * @param rootPath - The absolute path to the directory to list.
 * @param callback - The function to call.
 */
export function list(
  rootPath: string,
  callback: (err: Error, result: string[]) => void
): void;

/**
 * Asynchronously lists the files and directories in the given path.
 * The listing is not recursive.
 *
 * @param rootPath - The absolute path to the directory to list.
 * @param extensions - Extensions to filter the results by.
 *   If none are given, none are filtered.
 * @param callback - The function to call.
 */
export function list(
  rootPath: string,
  extensions: string[],
  callback: (err: Error, result: string[]) => void
): void;

/**
 * Returns only the paths which end with one of the given extensions.
 *
 * @param paths
 * @param extensions
 */
export function filterExtensions(
  paths: string[],
  extensions: string[]
): string[];

/**
 * Get all paths under the given path.
 *
 * @param rootPath - The path to start at.
 */
export function listTreeSync(rootPath: string): string[];

/**
 * Moves the source file or directory to the target asynchronously.
 *
 * @param source
 * @param target
 * @param callback
 */
export function move(
  source: string,
  target: string,
  callback: (err: Error) => void
): void;

/**
 * Moves the source file or directory to the target synchronously.
 *
 * @param source
 * @param target
 */
export function moveSync(source: string, target: string): void;

/**
 * Removes the file or directory at the given path synchronously.
 *
 * @param pathToRemove
 */
export function removeSync(pathToRemove: string): void;

/**
 * Removes the file or directory at the given path asynchronously.
 *
 * @param pathToRemove
 * @param callback
 */
export function remove(
  pathToRemove: string,
  callback: (err: Error) => void
): void;

/**
 * Open, write, flush, and close a file, writing the given content
 * synchronously. It also creates the necessary parent directories.
 *
 * @param filePath
 * @param content
 * @param options
 */
export function writeFileSync(
  filePath: string,
  content: string | Buffer,
  options?:
    | {
        encoding?: string | null | undefined;
        mode?: number | string | undefined;
        flag?: string | undefined;
      }
    | string
    | null
): void;

/**
 * Open, write, flush, and close a file, writing the given content
 * asynchronously. It also creates the necessary parent directories.
 *
 * @param filePath
 * @param content
 * @param callback
 */
export function writeFile(
  filePath: string,
  content: string | Buffer,
  callback: (err: any) => void
): void;

/**
 * Open, write, flush, and close a file, writing the given content
 * asynchronously. It also creates the necessary parent directories.
 *
 * @param filePath
 * @param content
 * @param options
 * @param callback
 */
export function writeFile(
  filePath: string,
  content: string | Buffer,
  options:
    | {
        encoding?: string | null | undefined;
        mode?: number | string | undefined;
        flag?: string | undefined;
      }
    | string
    | undefined
    | null,
  callback: (err: any) => void
): void;

/**
 * Copies the given path asynchronously.
 *
 * @param sourcePath
 * @param destinationPath
 * @param done
 */
export function copy(
  sourcePath: string,
  destinationPath: string,
  done: (err: any) => void
): void;

/**
 * Copies the given path recursively and synchronously.
 *
 * @param sourcePath
 * @param destinationPath
 */
export function copySync(sourcePath: string, destinationPath: string): void;

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
): void;

/**
 * Create a directory at the specified path including any missing
 * parent directories synchronously.
 *
 * @param directoryPath
 */
export function makeTreeSync(directoryPath: string): void;

/**
 * Create a directory at the specified path including any missing
 * parent directories asynchronously.
 *
 * @param directoryPath
 * @param callback
 */
export function makeTree(
  directoryPath: string,
  callback?: (err: any) => void
): void;

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
): void;

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
): void;

/**
 * Hashes the contents of the given file.
 *
 * @param pathToDigest - The absolute path.
 * @returns The MD5 hexadecimal hash.
 */
export function md5ForPath(pathToDigest: string): string;

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
): string | undefined;
export function resolve(
  ...args: [...loadPaths: string[], pathToResolve: string, extensions: string[]]
): string | undefined;

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
): string | undefined;

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
export function resolveExtension(
  pathToResolve: string,
  extensions: string[]
): string | undefined;

/**
 * Returns true for extensions associated with compressed files.
 *
 * @param ext
 */
export function isCompressedExtension(ext: string): boolean;

/**
 * Returns true for extensions associated with image files.
 *
 * @param ext
 */
export function isImageExtension(ext: string): boolean;

/**
 * Returns true for extensions associated with PDF files.
 *
 * @param ext
 */
export function isPdfExtension(ext: string): boolean;

/**
 * Returns true for extensions associated with binary files.
 *
 * @param ext
 */
export function isBinaryExtension(ext: string): boolean;

/**
 * Returns true for files named similarly to 'README'.
 *
 * @param readmePath
 */
export function isReadmePath(readmePath: string): boolean;

/**
 * Returns true for extensions associated with Markdown files.
 *
 * @param ext
 */
export function isMarkdownExtension(ext: string): boolean;

/**
 * Is the filesystem case insensitive?
 *
 * @returns True if case insensitive, false otherwise.
 */
export function isCaseInsensitive(): boolean;

/**
 * Is the filesystem case sensitive?
 *
 * @returns True if case sensitive, false otherwise.
 */
export function isCaseSensitive(): boolean;

/**
 * Calls `fs.statSync`, catching all exceptions raised. This method calls
 * `fs.statSyncNoException` when provided by the underlying `fs` module
 * (Electron < 3.0).
 *
 * @returns The stats if the file exists, false otherwise.
 */
export function statSyncNoException(
  ...args: Parameters<typeof import("fs").statSync>
): Stats | false;

/**
 * Calls `fs.lstatSync`, catching all exceptions raised. This method calls
 * `fs.lstatSyncNoException` when provided by the underlying `fs` module
 * (Electron < 3.0).
 *
 * @returns The stats if the file exists, false otherwise.
 */
export function lstatSyncNoException(
  ...args: Parameters<typeof import("fs").lstatSync>
): Stats | false;
