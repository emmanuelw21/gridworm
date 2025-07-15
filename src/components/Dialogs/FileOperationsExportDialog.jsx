// FileOperationsExportDialog.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, FolderOpen, Copy, ArrowRight } from 'lucide-react';

const FileOperationsExportDialog = ({
  showDialog,
  onClose,
  selectedMediaItems = [],
  onLogCommands = () => { }
}) => {
  const [operationType, setOperationType] = useState('move');
  const [platform, setPlatform] = useState('windows_ps');
  const [targetDirectory, setTargetDirectory] = useState(platform === 'posix' ? '/path/to/destination' : 'C:\\destination\\folder');
  const [generatedCommands, setGeneratedCommands] = useState('');
  const [copied, setCopied] = useState(false);

  const commandTextareaRef = useRef(null);

  // Update placeholder for targetDirectory when platform changes
  useEffect(() => {
    if (platform === 'posix') {
      if (targetDirectory === 'C:\\destination\\folder' || !targetDirectory.startsWith('/')) {
        setTargetDirectory('/path/to/destination');
      }
    } else {
      if (targetDirectory === '/path/to/destination' || !targetDirectory.includes(':\\')) {
        setTargetDirectory('C:\\destination\\folder');
      }
    }
  }, [platform]);

  // Path Normalization (Crucial for script correctness)
  const normalizePathForScript = (path, scriptPlatform) => {
    if (!path) return "''"; // Return empty quoted string if path is empty
    let normalized = path.trim();

    if (scriptPlatform === 'windows_ps') {
      // For PowerShell, escape single quotes by doubling them, then enclose in single quotes.
      normalized = normalized.replace(/'/g, "''");
      return `'${normalized}'`;
    } else if (scriptPlatform === 'windows_cmd') {
      // For CMD, enclose in double quotes if it contains spaces.
      return normalized.includes(' ') ? `"${normalized}"` : normalized;
    } else { // posix (bash/sh)
      // For POSIX, escape single quotes: ' -> '\'' and enclose in single quotes.
      normalized = normalized.replace(/'/g, "'\\''");
      return `'${normalized}'`;
    }
  };

  // Command Generation Functions
  const generateDeleteCommands = () => {
    const validItems = selectedMediaItems.filter(item => item && item.name);

    if (validItems.length === 0) {
      return '# No files selected';
    }

    let scriptLines = [];
    const hasOnlyFilenames = validItems.every(item => !item.userPath);

    if (platform === 'windows_ps') {
      scriptLines.push(
        `# PowerShell script to delete files`,
        hasOnlyFilenames ? `# NOTE: Run this script from the directory containing these files` : '',
        `$ErrorActionPreference = 'Continue'`,
        ``
      );

      validItems.forEach((item, index) => {
        const sourcePath = normalizePathForScript(item.userPath || item.name, platform);

        scriptLines.push(
          `# File ${index + 1}: ${item.name}`,
          `if (Test-Path -Path ${sourcePath} -PathType Leaf) {`,
          `    Remove-Item -Path ${sourcePath} -Force`,
          `    Write-Host "Deleted: ${sourcePath}" -ForegroundColor Green`,
          `} else {`,
          `    Write-Host "Not found: ${sourcePath}" -ForegroundColor Yellow`,
          `}`,
          ``
        );
      });
    } else if (platform === 'windows_cmd') {
      scriptLines.push(
        `@echo off`,
        `REM Batch script to delete files`,
        hasOnlyFilenames ? `REM NOTE: Run this script from the directory containing these files` : '',
        ``
      );
      validItems.forEach(item => {
        const sourcePath = normalizePathForScript(item.userPath || item.name, platform);
        scriptLines.push(`echo Deleting ${item.name}...`);
        scriptLines.push(`if exist ${sourcePath} ( del /F /Q ${sourcePath} ) else ( echo File not found: ${sourcePath} )`);
      });
    } else {
      scriptLines.push(
        `#!/bin/bash`,
        `# Shell script to delete files`,
        hasOnlyFilenames ? `# NOTE: Run this script from the directory containing these files` : '',
        ``
      );
      validItems.forEach(item => {
        const sourcePath = normalizePathForScript(item.userPath || item.name, platform);
        scriptLines.push(`echo "Deleting ${item.name}..."`);
        scriptLines.push(`rm -f ${sourcePath}`);
      });
    }

    return scriptLines.filter(line => line !== undefined).join('\n');
  };

  const generateMoveOrCopyCommands = (isMoveOperation) => {
    const validItems = selectedMediaItems.filter(item => item && item.name);

    if (validItems.length === 0) {
      return '# No files selected';
    }

    if (!targetDirectory.trim()) {
      return '# Please specify a target directory';
    }

    const operationVerb = isMoveOperation ? "Move" : "Copy";
    const operationCmdPs = isMoveOperation ? "Move-Item" : "Copy-Item";
    const operationCmdWin = isMoveOperation ? "move /Y" : "copy /Y";
    const operationCmdPosix = isMoveOperation ? "mv -f" : "cp -f";

    let scriptLines = [];
    const normTargetDir = normalizePathForScript(targetDirectory.trim(), platform);
    const hasOnlyFilenames = validItems.every(item => !item.userPath);

    if (platform === 'windows_ps') {
      // Start with variable declarations and directory creation
      scriptLines.push(
        `# PowerShell script to ${operationVerb.toLowerCase()} files`,
        hasOnlyFilenames ? `# NOTE: Run this script from the directory containing these files` : '',
        `$ErrorActionPreference = 'Continue'`,
        `$TargetFolder = ${normTargetDir}`,
        ``,
        `# Create target directory if it doesn't exist`,
        `if (-not (Test-Path -Path $TargetFolder -PathType Container)) {`,
        `    New-Item -ItemType Directory -Path $TargetFolder -Force | Out-Null`,
        `    Write-Host "Created directory: $TargetFolder" -ForegroundColor Green`,
        `}`,
        ``
      );

      // Generate direct commands without function wrapper
      scriptLines.push(`# Process each file`);

      validItems.forEach((item, index) => {
        // Improved path handling for source
        let sourcePath;
        const hasRelativePath = item.userPath &&
          (item.userPath.includes('/') || item.userPath.includes('\\')) &&
          !/^([a-zA-Z]:[\\/]|[\\/])/.test(item.userPath);

        if (hasRelativePath || !item.userPath) {
          sourcePath = normalizePathForScript(item.name, platform);
        } else {
          sourcePath = normalizePathForScript(item.userPath, platform);
        }
        const fileName = normalizePathForScript(item.name, platform);

        scriptLines.push(
          ``,
          `# File ${index + 1}: ${item.name}`,
          `$Source = ${sourcePath}`,
          `$DestFile = Join-Path -Path $TargetFolder -ChildPath ${fileName}`,
          `if (Test-Path -Path $Source -PathType Leaf) {`,
          `    ${operationCmdPs} -Path $Source -Destination $DestFile -Force`,
          `    Write-Host "${operationVerb}d: $Source -> $DestFile" -ForegroundColor Green`,
          `} else {`,
          `    Write-Host "Source not found: $Source" -ForegroundColor Yellow`,
          `}`
        );
      });

      // Add a final comment to ensure script completion
      scriptLines.push(``, `# Script completed`);
    } else if (platform === 'windows_cmd') {
      // Windows CMD remains the same
      if (scriptLines.length === 0) {
        scriptLines.push(
          `@echo off`,
          `REM Batch script to ${operationVerb.toLowerCase()} files`,
          hasOnlyFilenames ? `REM NOTE: Run this script from the directory containing these files` : '',
          ``,
          `if not exist ${normTargetDir} (`,
          `  mkdir ${normTargetDir}`,
          `)`
        );
      }
      validItems.forEach(item => {
        const sourcePath = normalizePathForScript(item.userPath || item.name, platform);
        const destFilePath = `${normTargetDir}\\${item.name}`;
        scriptLines.push(`echo ${operationVerb}ing ${item.name}...`);
        scriptLines.push(`${operationCmdWin} ${sourcePath} ${destFilePath}`);
      });
    } else {
      // POSIX remains the same
      scriptLines.push(
        `#!/bin/bash`,
        `# Shell script to ${operationVerb.toLowerCase()} files`,
        hasOnlyFilenames ? `# NOTE: Run this script from the directory containing these files` : '',
        ``,
        `mkdir -p ${normTargetDir}`,
        ``
      );
      validItems.forEach(item => {
        const sourcePath = normalizePathForScript(item.userPath || item.name, platform);
        const destFilePath = `${normTargetDir}/${item.name}`;
        scriptLines.push(`echo "${operationVerb}ing ${item.name}..."`);
        scriptLines.push(`${operationCmdPosix} ${sourcePath} '${destFilePath}'`);
      });
    }

    return scriptLines.filter(line => line !== undefined).join('\n');
  };

  const generateRenameCommands = () => {
    const validItems = selectedMediaItems.filter(item => item && item.name);
    if (validItems.length === 0) {
      return '# No files selected';
    }
    let scriptLines = [];
    const hasOnlyFilenames = validItems.every(item => !item.userPath);
    if (platform === 'windows_ps') {
      scriptLines.push(
        `# PowerShell script to rename files`,
        hasOnlyFilenames ? `# NOTE: Run this script from the directory containing these files` : '',
        `$ErrorActionPreference = 'Continue'`,
        ``
      );
      validItems.forEach((item, index) => {
        // Use original filename if stored in metadata, otherwise use current name
        const originalFileName = item.metadata?.originalFileName || item.name;
        const currentName = item.name;
        if (originalFileName === currentName) {
          scriptLines.push(
            `# File ${index + 1}: ${originalFileName} (no rename needed)`,
            ``
          );
          return;
        }
        // Determine the source path
        let sourcePath;
        const hasRelativePath = item.userPath &&
          (item.userPath.includes('/') || item.userPath.includes('\\')) &&
          !/^([a-zA-Z]:[\\/]|[\\/])/.test(item.userPath);
        if (hasRelativePath || !item.userPath) {
          sourcePath = normalizePathForScript(originalFileName, platform);
        } else {
          // For absolute paths, replace the filename portion with original
          const pathParts = item.userPath.split(/[\\/]/);
          pathParts[pathParts.length - 1] = originalFileName;
          sourcePath = normalizePathForScript(pathParts.join('\\'), platform);
        }
        const newNameNormalized = normalizePathForScript(currentName, platform);
        scriptLines.push(
          `# File ${index + 1}: ${originalFileName} -> ${currentName}`,
          `if (Test-Path -Path ${sourcePath} -PathType Leaf) {`,
          `    Rename-Item -Path ${sourcePath} -NewName ${newNameNormalized} -Force`,
          `    Write-Host "Renamed: ${originalFileName} -> ${currentName}" -ForegroundColor Green`,
          `} else {`,
          `    Write-Host "Not found: ${sourcePath}" -ForegroundColor Yellow`,
          `}`,
          ``
        );
      });
    } else if (platform === 'windows_cmd') {
      scriptLines.push(
        `@echo off`,
        `REM Batch script to rename files`,
        hasOnlyFilenames ? `REM NOTE: Run this script from the directory containing these files` : '',
        ``
      );
      validItems.forEach(item => {
        const originalFileName = item.metadata?.originalFileName || item.name;
        const currentName = item.name;
        if (originalFileName === currentName) return;
        const normOriginalPath = normalizePathForScript(originalFileName, platform);
        scriptLines.push(`echo Renaming ${originalFileName} to ${currentName}...`);
        scriptLines.push(`if exist ${normOriginalPath} ( ren ${normOriginalPath} "${currentName}" )`);
      });
    } else { // POSIX
      scriptLines.push(
        `#!/bin/bash`,
        `# Shell script to rename files`,
        hasOnlyFilenames ? `# NOTE: Run this script from the directory containing these files` : '',
        ``
      );
      validItems.forEach(item => {
        const originalFileName = item.metadata?.originalFileName || item.name;
        const currentName = item.name;
        if (originalFileName === currentName) return;
        const normOriginalPath = normalizePathForScript(originalFileName, platform);
        const normNewPath = normalizePathForScript(currentName, platform);
        scriptLines.push(`echo "Renaming ${originalFileName} to ${currentName}..."`);
        scriptLines.push(`mv -f ${normOriginalPath} ${normNewPath}`);
      });
    }
    return scriptLines.filter(line => line !== undefined).join('\n');
  };
  const updateGeneratedCommands = useCallback(() => {
    let commands = '';
    if (operationType === 'delete') commands = generateDeleteCommands();
    else if (operationType === 'move') commands = generateMoveOrCopyCommands(true);
    else if (operationType === 'copy') commands = generateMoveOrCopyCommands(false);
    else if (operationType === 'rename') commands = generateRenameCommands();
    setGeneratedCommands(commands);
  }, [operationType, platform, targetDirectory, selectedMediaItems]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDirectorySelect = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const directoryHandle = await window.showDirectoryPicker();
        setTargetDirectory(directoryHandle.name + " (Selected via Picker - Verify Path for Script)");
      } else {
        alert("Directory picker API not supported by your browser. Please type the path manually.");
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Error selecting directory:", error);
        alert("Could not select directory. Please enter the path manually.");
      }
    }
  };

  const copyCommandsToClipboard = () => {
    if (!generatedCommands || generatedCommands === '# No files selected') {
      alert('No files selected to generate commands.');
      return;
    }
    navigator.clipboard.writeText(generatedCommands).then(() => {
      setCopied(true);
      onLogCommands(generatedCommands, platform);
    }).catch(err => {
      console.error("Failed to copy commands:", err);
      alert("Failed to copy commands to clipboard. See console for details.");
    });
  };

  // Generate commands on mount and when dependencies change
  useEffect(() => {
    if (showDialog) {
      updateGeneratedCommands();
    }
  }, [showDialog, updateGeneratedCommands]);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  if (!showDialog) return null;

  // Check how many files have valid paths
  const filesWithPaths = selectedMediaItems.filter(item => item?.userPath).length;
  const filesWithoutPaths = selectedMediaItems.length - filesWithPaths;
  const hasAnyFiles = selectedMediaItems.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100">
            Export File Operations ({selectedMediaItems.length} files)
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-slate-300 dark:hover:text-slate-100"
            aria-label="Close dialog"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 text-gray-900 dark:text-slate-200 space-y-4">
          {filesWithoutPaths > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-md p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                ⚠️ Files don't have system paths.
                Only filenames will be used in the commands.
                <strong className="block mt-1">Run the generated script from the directory containing these files. If any files have relative paths (e.g., WebM/file.webm), only the filename will be used in the script.</strong>
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Operation Type:</label>
            <div className="flex space-x-3 flex-wrap gap-y-2">
              {[{ value: 'move', label: 'Move' }, { value: 'copy', label: 'Copy' }, { value: 'delete', label: 'Delete' }, { value: 'rename', label: 'Rename' }].map(op => (
                <label key={op.value} className="inline-flex items-center cursor-pointer">
                  <input
                    type="radio" value={op.value} checked={operationType === op.value}
                    onChange={() => setOperationType(op.value)}
                    className="form-radio h-4 w-4 text-blue-600 dark:text-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-slate-300">{op.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Target Platform:</label>
            <div className="flex space-x-3 flex-wrap gap-y-2">
              {[{ value: 'windows_ps', label: 'PowerShell' }, { value: 'windows_cmd', label: 'Windows CMD' }, { value: 'posix', label: 'Unix/Linux/Mac' }].map(plat => (
                <label key={plat.value} className="inline-flex items-center cursor-pointer">
                  <input
                    type="radio" value={plat.value} checked={platform === plat.value}
                    onChange={() => setPlatform(plat.value)}
                    className="form-radio h-4 w-4 text-blue-600 dark:text-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-slate-300">{plat.label}</span>
                </label>
              ))}
            </div>
          </div>

          {(operationType === 'move' || operationType === 'copy') && (
            <div>
              <label htmlFor="targetDirectoryInput" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Target Directory:</label>
              <div className="flex w-full">
                <input
                  id="targetDirectoryInput"
                  type="text"
                  value={targetDirectory}
                  onChange={(e) => setTargetDirectory(e.target.value)}
                  placeholder={platform === 'posix' ? "/path/to/destination" : "C:\\path\\to\\destination"}
                  className="flex-1 p-2 border border-gray-300 rounded-l-md dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600"
                />
                <button
                  onClick={handleDirectorySelect}
                  className="p-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                  title="Browse for directory (experimental)"
                >
                  <FolderOpen size={20} />
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                Note: Browser-based directory selection is limited. Pasting or typing the full path is often more reliable.
              </p>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Generated Commands:</label>
              <div className="flex space-x-2">
                {/* <button
                  onClick={updateGeneratedCommands}
                  className="p-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
                  title="Refresh commands"
                >
                  <RefreshCw size={16} />
                </button> */}
                <button
                  onClick={copyCommandsToClipboard}
                  disabled={!hasAnyFiles}
                  className={`px-3 py-1.5 rounded flex items-center text-sm
                    ${copied
                      ? 'bg-green-600 text-white'
                      : hasAnyFiles
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  title="Copy to clipboard"
                >
                  <Copy size={16} className="mr-1.5" /> {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <textarea
              ref={commandTextareaRef}
              value={generatedCommands}
              onChange={(e) => setGeneratedCommands(e.target.value)}
              className="w-full h-40 sm:h-56 p-3 border border-gray-300 rounded-md font-mono text-xs bg-gray-50 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-600 resize-y"
              placeholder="Commands will appear here..."
              spellCheck="false"
            />
          </div>

          <div className="mt-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Selected Files ({selectedMediaItems.length}):</h3>
            <div className="max-h-24 overflow-y-auto border border-gray-300 dark:border-slate-700 rounded-md p-2 bg-gray-50 dark:bg-slate-700">
              {selectedMediaItems.length === 0 ? (
                <p className="text-gray-500 dark:text-slate-400 text-sm italic">No files selected</p>
              ) : (
                <ul className="text-xs">
                  {selectedMediaItems.map((item, index) => (
                    <li key={item?.id || index} className="flex items-center py-0.5 border-b border-gray-200 dark:border-slate-600 last:border-0">
                      <ArrowRight size={12} className="text-gray-400 dark:text-slate-500 mr-2 flex-shrink-0" />
                      <span className="truncate text-gray-700 dark:text-slate-300" title={item?.userPath || item?.name}>
                        {item?.userPath || item?.name || 'Unknown file'}
                        {/* {!item?.userPath && <span className="text-amber-600 dark:text-amber-400 ml-1">(no path)</span>} */}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileOperationsExportDialog;