# fs plus

[![CI](https://github.com/craftzdog/fs-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/craftzdog/fs-plus/actions/workflows/ci.yml)

Yet another filesystem helper based on node's [fs](https://nodejs.org/api/fs.html)
module. This library exports everything from node's fs module but with some
extra helpers.

This is a maintained fork of [atom/fs-plus](https://github.com/atom/fs-plus),
which was archived together with Atom.

## Using

```sh
npm install @craftzdog/fs-plus
```

The package ships as an ES module.

```js
import fs from '@craftzdog/fs-plus'

fs.isFileSync('package.json') // an fs-plus helper
fs.readFileSync('package.json', 'utf8') // node's fs
```

Every helper and every function of node's fs is also available as a named
export:

```js
import { isFileSync, readFileSync } from '@craftzdog/fs-plus'
```

The default export looks up node's fs functions at access time and lets you
reassign a helper (for example to stub it in a test). The named exports are
fixed bindings.

CommonJS code can load the package with `require()` on Node.js 22.12 or later.
It receives the named exports; the object described above is on `.default`.

## Documentation

- [Paths](#paths)
- [Checking paths](#checking-paths)
- [Listing and traversing](#listing-and-traversing)
- [Writing, copying, moving and removing](#writing-copying-moving-and-removing)
- [Resolving](#resolving)
- [File types](#file-types)
- [Filesystem](#filesystem)

### Paths

#### `getHomeDirectory()`

Returns the absolute path to the home directory.

#### `absolute(relativePath)`

Make the given path absolute by resolving it against the current
working directory.

- **String** `relativePath`: The relative path. If the path is prefixed with
  '~', it will be expanded to the current user's home directory.

Returns the absolute path, or the given path if it's unable to determine its
real path.

#### `normalize(pathToNormalize)`

Normalize the given path treating a leading `~` segment as referring to the
home directory. This method does not query the filesystem.

- **String** `pathToNormalize`: The abnormal path. If the path is prefixed with
  '~', it will be expanded to the current user's home directory.

Returns the normalized path.

#### `tildify(pathToTildify)`

Convert an absolute path to a tilde path on Linux and macOS:
`/Users/username/dev` => `~/dev`. On Windows the path is returned unchanged.

- **String** `pathToTildify`: The full path.

Returns the tildified path.

#### `getAppDataDirectory()`

Get the path to store application specific data.

Returns the absolute path, or `null` if the platform isn't supported:

- macOS: `~/Library/Application Support/`
- Windows: `%AppData%`
- Linux: `/var/lib`

#### `isAbsolute(pathToCheck)`

Is the given path absolute?

- **String** `pathToCheck`: The relative or absolute path to check.

Returns `true` if the path is absolute, `false` otherwise.

### Checking paths

These helpers return `false` instead of throwing when the path is missing,
empty or not a string.

#### `existsSync(pathToCheck)`

Returns `true` if a file or folder at the specified path exists.

#### `isDirectorySync(directoryPath)`

Returns `true` if the given path exists and is a directory.

#### `isDirectory(directoryPath, done)`

Asynchronously checks that the given path exists and is a directory.

- **String** `directoryPath`: The path to check.
- **Function** `done`: Called with `true` or `false`.

#### `isFileSync(filePath)`

Returns `true` if the specified path exists and is a file.

#### `isSymbolicLinkSync(symlinkPath)`

Returns `true` if the specified path is a symbolic link.

#### `isSymbolicLink(symlinkPath, callback)`

Calls back with `true` if the specified path is a symbolic link.

#### `isExecutableSync(pathToCheck)`

Returns `true` if the specified path is executable.

#### `getSizeSync(pathToCheck)`

Returns the size of the specified path in bytes, or `-1` if it doesn't exist.

### Listing and traversing

#### `listSync(rootPath[, extensions])`

Returns an Array with the paths of the files and directories contained within
the directory path, sorted alphabetically. It is not recursive.

- **String** `rootPath`: The absolute path to the directory to list.
- **Array** `extensions`: An array of extensions to filter the results by. If
  none are given, none are filtered (optional).

Returns an empty array if the path isn't a directory.

#### `list(rootPath[, extensions], callback)`

Asynchronously lists the files and directories in the given path. The listing
is not recursive.

- **String** `rootPath`: The absolute path to the directory to list.
- **Array** `extensions`: An array of extensions to filter the results by
  (optional).
- **Function** `callback`: Called with `(error, paths)`.

#### `filterExtensions(paths, extensions)`

Returns only the paths which end with one of the given extensions. The
extensions may be given with or without the leading `.`.

#### `listTreeSync(rootPath)`

Get all paths under the given path.

- **String** `rootPath`: The path to start at.

Returns an array of the paths under the given path.

#### `traverseTreeSync(rootPath, onFile[, onDirectory])`

Recursively walk the given path and execute the given functions
synchronously.

- **String** `rootPath`: The directory to recurse into.
- **Function** `onFile`: The function to execute on each file, receives a single
  argument, the absolute path.
- **Function** `onDirectory`: The function to execute on each directory,
  receives a single argument, the absolute path (defaults to `onFile`). If this
  function returns a falsy value then the directory is not entered.

#### `traverseTree(rootPath, onFile, onDirectory[, onDone])`

Recursively walk the given path and execute the given functions
asynchronously.

- **String** `rootPath`: The directory to recurse into.
- **Function** `onFile`: The function to execute on each file, receives a single
  argument, the absolute path.
- **Function** `onDirectory`: The function to execute on each directory,
  receives a single argument, the absolute path. If this function returns a
  falsy value then the directory is not entered.
- **Function** `onDone`: Called when the traversal is complete (optional).

### Writing, copying, moving and removing

#### `writeFileSync(filePath, content[, options])`

Open, write, flush, and close a file, writing the given content synchronously.
It also creates the necessary parent directories.

#### `writeFile(filePath, content[, options], callback)`

Open, write, flush, and close a file, writing the given content
asynchronously. It also creates the necessary parent directories.

#### `makeTreeSync(directoryPath)`

Create a directory at the specified path including any missing
parent directories synchronously.

#### `makeTree(directoryPath[, callback])`

Create a directory at the specified path including any missing
parent directories asynchronously.

#### `copy(sourcePath, destinationPath, done)`

Copies the file at the given path asynchronously, creating the destination's
parent directories if needed.

- **Function** `done`: Called with an error if the copy failed.

#### `copySync(sourcePath, destinationPath)`

Copies the given directory recursively and synchronously.

#### `copyFileSync(sourceFilePath, destinationFilePath[, bufferSize])`

Copies the given file synchronously, buffering reads and writes to keep the
memory footprint to a minimum. If the destination directory doesn't exist, it
creates it.

- **String** `sourceFilePath`: The file path you want to copy.
- **String** `destinationFilePath`: The file path where the file will be
  copied.
- **Number** `bufferSize`: The size in bytes of the buffer used when reading
  from and writing to disk (optional, defaults to 16KB).

#### `move(source, target, callback)`

Moves the file or directory to the target asynchronously, creating the
target's parent directories if needed.

- **Function** `callback`: Called with an error if the move failed. The error
  has the code `EEXIST` if the target already exists, unless the target only
  differs from the source in letter casing.

#### `moveSync(source, target)`

Moves the file or directory to the target synchronously. Throws an error with
the code `EEXIST` if the target already exists.

#### `remove(pathToRemove, callback)`

Removes the file or directory at the given path asynchronously.

- **Function** `callback`: Called with an error if the removal failed.

#### `removeSync(pathToRemove)`

Removes the file or directory at the given path synchronously.

It throws unless [`loadRimRaf()`](#loadrimraf) has finished beforehand.

#### `loadRimRaf()`

Loads the [rimraf](https://github.com/isaacs/rimraf) module, which
`removeSync` needs. Returns a Promise that resolves once it is available.

```js
await fs.loadRimRaf()
fs.removeSync('/path/to/remove')
```

### Resolving

#### `resolve(...loadPaths, pathToResolve[, extensions])`

Finds a relative path among the given load paths.

- **String** `...loadPaths`: The absolute and relative paths to search, each as
  its own argument.
- **String** `pathToResolve`: The path to resolve.
- **Array** `extensions`: An array of extensions to pass to
  `resolveExtension`, in which case `pathToResolve` should not contain an
  extension (optional).

Returns the absolute path of the file to be resolved if it's found and
`undefined` otherwise.

```js
fs.resolve('/usr/lib', '/usr/local/lib', 'config', ['json', 'cson'])
```

#### `resolveOnLoadPath(pathToResolve[, extensions])`

Like `resolve` but uses node's module paths as the load paths to search.

#### `resolveExtension(pathToResolve, extensions)`

Finds the first file in the given path which matches the extension
in the order given.

- **String** `pathToResolve`: The relative or absolute path of the file in
  question without the extension or '.'.
- **Array** `extensions`: The ordered array of extensions to try.

Returns the absolute path of the file if it exists with any of the given
extensions, otherwise it's `undefined`.

#### `md5ForPath(pathToDigest)`

Hashes the contents of the given file.

- **String** `pathToDigest`: The absolute path.

Returns a string containing the MD5 hexadecimal hash.

### File types

The extension is expected with its leading `.` and is matched case
insensitively.

#### `isCompressedExtension(ext)`

Returns `true` for extensions associated with compressed files.

#### `isImageExtension(ext)`

Returns `true` for extensions associated with image files.

#### `isPdfExtension(ext)`

Returns `true` for extensions associated with PDF files.

#### `isBinaryExtension(ext)`

Returns `true` for extensions associated with binary files.

#### `isMarkdownExtension(ext)`

Returns `true` for extensions associated with Markdown files.

#### `isReadmePath(readmePath)`

Returns `true` for files named similarly to 'README'.

### Filesystem

#### `isCaseInsensitive()`

Is the filesystem case insensitive?
Returns `true` if case insensitive, `false` otherwise.

#### `isCaseSensitive()`

Is the filesystem case sensitive?
Returns `true` if case sensitive, `false` otherwise.

#### `statSyncNoException(path[, options])`

Calls [`fs.statSync`](https://nodejs.org/api/fs.html#fsstatsyncpath-options), catching all exceptions raised.
Returns `fs.Stats` if the file exists, `false` otherwise.

#### `lstatSyncNoException(path[, options])`

Calls [`fs.lstatSync`](https://nodejs.org/api/fs.html#fslstatsyncpath-options), catching all exceptions raised.
Returns `fs.Stats` if the file exists, `false` otherwise.

## Development

```sh
npm run build   # bundle src/ into lib/ with tsdown
npm test        # run the specs with vitest
npm run lint    # oxlint
npm run typecheck # tsc
npm run format  # oxfmt
```

## License

[MIT](LICENSE.md)
