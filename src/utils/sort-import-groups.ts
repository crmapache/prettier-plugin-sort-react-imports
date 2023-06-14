import config from '../config'
import { ImportData, ImportGroups, LibraryRule } from '../types'

const getImportDepth = (path: string) => {
  return path.split('/').length
}

const asc = (a, b) => {
  const depthA = getImportDepth(a.path)
  const depthB = getImportDepth(b.path)

  if (depthA !== depthB) {
    return depthA - depthB
  } else {
    return a.path.localeCompare(b.path)
  }
}

const desc = (a, b) => {
  const depthA = getImportDepth(a.path)
  const depthB = getImportDepth(b.path)

  if (depthA !== depthB) {
    return depthB - depthA
  } else {
    return a.path.localeCompare(b.path)
  }
}

const sortLibraries = (imports: ImportData[]) => {
  let result: ImportData[] = []
  const groups = {}

  for (const library of config.libs) {
    groups[library.name] = []

    for (let i = 0; i < imports.length; i++) {
      const importData = imports[i]

      if (
        (library.rule === LibraryRule.EXACT && importData.path === library.name) ||
        (library.rule === LibraryRule.STARTS && importData.path.startsWith(library.name)) ||
        (library.rule === LibraryRule.INCLUDES && importData.path.includes(library.name))
      ) {
        groups[library.name].push(importData)
        imports.splice(i, 1)
        i--
      }
    }
  }

  for (const groupKey in groups) {
    groups[groupKey].sort(asc)
    result = [...result, ...groups[groupKey]]
  }

  imports.sort(asc)

  result = [...result, ...imports]

  return destructuringSort(result)
}

const sortAliases = (imports: ImportData[]) => {
  const sortedImports = imports.sort(asc)

  return destructuringSort(sortedImports)
}

const sortRelatives = (imports: ImportData[]) => {
  const outFolderImports = []
  const currentFolderImports = []

  for (const importData of imports) {
    if (importData.path.startsWith('./')) {
      currentFolderImports.push(importData)
    } else {
      outFolderImports.push(importData)
    }
  }

  outFolderImports.sort(desc)
  currentFolderImports.sort(desc)

  return destructuringSort(outFolderImports.concat(currentFolderImports))
}

const destructuringSort = (imports: ImportData[]) => {
  const result = []

  for (const importData of imports) {
    const searchResult = importData.raw.match(/\{[\s\S]+?}/gm)

    if (searchResult) {
      const importElementsString = searchResult[0].replace(/[{}\s]/gm, '')

      const importElements = importElementsString
        .split(',')
        .filter((importElement) => importElement)

      importElements.sort(function (a, b) {
        if (a.length === b.length) {
          return a.localeCompare(b)
        } else {
          return a.length - b.length
        }
      })

      result.push({
        raw: importData.raw.replace(/\{[\s\S]+?}/gm, `{ ${importElements.join(',')} }`),
        path: importData.path,
      })
    } else {
      result.push(importData)
    }
  }

  return result
}

export const sortImportGroups = (inputGroups: ImportGroups) => {
  return {
    libraries: sortLibraries(inputGroups.libraries),
    aliases: sortAliases(inputGroups.aliases),
    relatives: sortRelatives(inputGroups.relatives),
    directRelatives: sortRelatives(inputGroups.directRelatives),
  }
}
