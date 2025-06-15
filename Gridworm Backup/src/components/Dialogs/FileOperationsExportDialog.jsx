// FileOperationsExportDialog.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, FolderOpen, Copy, RefreshCw, ArrowRight } from 'lucide-react';

const FileOperationsExportDialog = ({
  showDialog,
  onClose,
  selectedMediaItems = [],
  onLogCommands = () => {}
}) => {
  const [operationType, setOperationType] = useState('move');
  const [platform, setPlatform] = useState('windows_ps');
  const [targetDirectory, setTargetDirectory] = useState(platform === 'posix' ? '/path/to/destination' : 'C:\\destination\\folder');
  const [generatedCommands, setGeneratedCommands] = useState('');
  const [copied, setCopied] = useState(false);

  const commandTextareaRef = useRef(null);
  // directoryInputRef is not strictly needed if using showDirectoryPicker mainly
  // but can be kept for the fallback input if that's ever re-enabled.

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


  // --- Path Normalization (Crucial for script correctness) ---
  const normalizePathForScript = (path, scriptPlatform) => {
    if (!path) return "''"; // Return empty quoted string if path is empty
    let normalized = path.trim();

    if (scriptPlatform === 'windows_ps') {
      // For PowerShell, escape single quotes by doubling them, then enclose in single quotes.
      normalized = normalized.replace(/'/g, "''");
      return `'${normalized}'`;
    } else if (scriptPlatform === 'windows_cmd') {
      // For CMD, enclose in double quotes if it contains spaces. No complex escaping needed for DEL, MOVE, COPY.
      return normalized.includes(' ') ? `"${normalized}"` : normalized;
    } else { // posix (bash/sh)
      // For POSIX, escape single quotes: ' -> '\'' and enclose in single quotes.
      normalized = normalized.replace(/'/g, "'\\''");
      return `'${normalized}'`;
    }
  };

  // --- Command Generation Functions (using user's more robust "fixed version" logic) ---
  const generateDeleteCommands = () => {
    if (selectedMediaItems.length === 0) return '';
    let scriptLines = [];

    selectedMediaItems.forEach(item => {
        if (!item || !item.userPath) return; // Ensure userPath exists
        const sourcePath = normalizePathForScript(item.userPath, platform);
        const itemNameForComment = item.name || 'unknown_file';

        if (platform === 'windows_ps') {
            if (scriptLines.length === 0) {
                scriptLines.push(
                    `# PowerShell script to delete files`,
                    `$ErrorActionPreference = 'Continue' # Or 'Stop' to halt on first error`,
                    `function Safe-Remove-File {`,
                    `    param([string]$PathToDelete)`,
                    `    if (Test-Path -Path $PathToDelete -PathType Leaf) {`,
                    `        Remove-Item -Path $PathToDelete -Force`,
                    `        Write-Host "Deleted: $PathToDelete" -ForegroundColor Green`,
                    `    } elseif (Test-Path -Path $PathToDelete -PathType Container) {`,
                    `        Write-Host "Skipping directory (or specify -Recurse if intended): $PathToDelete" -ForegroundColor Yellow`,
                    `    } else {`,
                    `        Write-Host "Not found: $PathToDelete" -ForegroundColor Yellow`,
                    `    }`,
                    `}\n`
                );
            }
            scriptLines.push(`Safe-Remove-File -PathToDelete ${sourcePath} # Original: ${itemNameForComment}`);
        } else if (platform === 'windows_cmd') {
            if (scriptLines.length === 0) scriptLines.push(`@echo off`, `REM Batch script to delete files\n`);
            scriptLines.push(`echo Deleting ${itemNameForComment}...`);
            scriptLines.push(`if exist ${sourcePath} ( del /F /Q ${sourcePath} ) else ( echo File not found: ${sourcePath} )`);
        } else { // posix
            if (scriptLines.length === 0) scriptLines.push(`#!/bin/bash`, `# Shell script to delete files\n`);
            scriptLines.push(`echo "Deleting ${itemNameForComment}..."`);
            scriptLines.push(`rm -f ${sourcePath} # Original: ${itemNameForComment}`);
        }
    });
    return scriptLines.join('\n');
  };

  const generateMoveOrCopyCommands = (isMoveOperation) => {
    const operationVerb = isMoveOperation ? "Move" : "Copy";
    const operationCmdPs = isMoveOperation ? "Move-Item" : "Copy-Item";
    const operationCmdWin = isMoveOperation ? "move /Y" : "copy /Y"; // /Y to suppress overwrite confirmation
    const operationCmdPosix = isMoveOperation ? "mv -f" : "cp -rf"; // -f for force, -r for copy (robust for accidental dirs)

    if (selectedMediaItems.length === 0 || !targetDirectory.trim()) return '';
    let scriptLines = [];
    const normTargetDir = normalizePathForScript(targetDirectory.trim(), platform);
    const targetDirForComment = targetDirectory.trim();

    selectedMediaItems.forEach(item => {
        if (!item || !item.userPath || !item.name) return;
        const sourcePath = normalizePathForScript(item.userPath, platform);
        const fileName = item.name; // Keep original name for destination
        const itemNameForComment = item.name;

        if (platform === 'windows_ps') {
            if (scriptLines.length === 0) {
                scriptLines.push(
                    `# PowerShell script to ${operationVerb.toLowerCase()} files`,
                    `$ErrorActionPreference = 'Continue'`,
                    `$TargetFolder = ${normTargetDir}`,
                    `if (-not (Test-Path -Path $TargetFolder -PathType Container)) {`,
                    `    New-Item -ItemType Directory -Path $TargetFolder -Force | Out-Null`,
                    `    Write-Host "Created directory: $TargetFolder"`,
                    `}\n`,
                    `function Safe-${operationVerb}-File {`,
                    `    param([string]$Source, [string]$DestinationFolder, [string]$FileNameForDest)`,
                    `    $DestFile = Join-Path -Path $DestinationFolder -ChildPath $FileNameForDest`,
                    `    if (Test-Path -Path $Source -PathType Leaf) {`,
                    `        ${operationCmdPs} -Path $Source -Destination $DestFile -Force`,
                    `        Write-Host "${operationVerb}d: $Source -> $DestFile" -ForegroundColor Green`,
                    `    } else {`,
                    `        Write-Host "Source not found or not a file: $Source" -ForegroundColor Yellow`,
                    `    }`,
                    `}\n`
                );
            }
            scriptLines.push(`Safe-${operationVerb}-File -Source ${sourcePath} -DestinationFolder $TargetFolder -FileNameForDest ${normalizePathForScript(fileName, platform)} # Original: ${itemNameForComment}`);
        } else if (platform === 'windows_cmd') {
            if (scriptLines.length === 0) {
                scriptLines.push(`@echo off`, `REM Batch script to ${operationVerb.toLowerCase()} files to ${targetDirForComment}\n`);
                scriptLines.push(`if not exist ${normTargetDir} (`, `  echo Creating directory: ${normTargetDir}`, `  mkdir ${normTargetDir}`, `)`);
            }
            const destFilePath = `${normTargetDir}\\${fileName.includes(" ") ? `"${fileName}"` : fileName}`;
            scriptLines.push(`echo ${operationVerb}ing ${itemNameForComment}...`);
            scriptLines.push(`if exist ${sourcePath} ( ${operationCmdWin} ${sourcePath} ${destFilePath} ) else ( echo Source file not found: ${sourcePath} )`);
        } else { // posix
            if (scriptLines.length === 0) {
                scriptLines.push(`#!/bin/bash`, `# Shell script to ${operationVerb.toLowerCase()} files to ${targetDirForComment}\n`);
                scriptLines.push(`mkdir -p ${normTargetDir}\n`);
            }
            const destFilePath = `${normTargetDir}/${fileName.replace(/'/g, "'\\''")}`; // Normalize only the filename part for joining
            scriptLines.push(`echo "${operationVerb}ing ${itemNameForComment}..."`);
            scriptLines.push(`${operationCmdPosix} ${sourcePath} '${destFilePath}' # Original: ${itemNameForComment}`);
        }
    });
    return scriptLines.join('\n');
  };
  
  const generateRenameCommands = () => {
    // Example: Appends "_processed" to the filename (before extension).
    if (selectedMediaItems.length === 0) return '';
    let scriptLines = [];

    selectedMediaItems.forEach(item => {
        if (!item || !item.userPath || !item.name) return;
        
        const originalPath = item.userPath;
        const originalName = item.name;
        const extIndex = originalName.lastIndexOf('.');
        const nameWithoutExt = extIndex === -1 ? originalName : originalName.substring(0, extIndex);
        const extension = extIndex === -1 ? '' : originalName.substring(extIndex);
        const newName = `${nameWithoutExt}_processed${extension}`;
        
        const normOriginalPath = normalizePathForScript(originalPath, platform);
        const normNewName = normalizePathForScript(newName, platform); // This will quote the new name if needed

        if (platform === 'windows_ps') {
            if (scriptLines.length === 0) {
              scriptLines.push(
                    `# PowerShell script to rename files`,
                    `$ErrorActionPreference = 'Continue'`,
                    `function Safe-Rename-File {`,
                    `    param([string]$CurrentPath, [string]$NewNameOnly)`,
                    `    if (Test-Path -Path $CurrentPath -PathType Leaf) {`,
                    `        Rename-Item -Path $CurrentPath -NewName $NewNameOnly -Force`,
                    `        Write-Host "Renamed: $CurrentPath -> $NewNameOnly" -ForegroundColor Green`,
                    `    } else {`,
                    `        Write-Host "Not found: $CurrentPath" -ForegroundColor Yellow`,
                    `    }`,
                    `}\n`
                );
            }
            // For Rename-Item, -NewName takes just the new name string, not the full path.
            scriptLines.push(`Safe-Rename-File -CurrentPath ${normOriginalPath} -NewNameOnly ${normNewName} # Original: ${originalName}`);
        } else if (platform === 'windows_cmd') {
            if (scriptLines.length === 0) scriptLines.push(`@echo off`, `REM Batch script to rename files\n`);
            const newNameForCmd = newName.includes(" ") ? `"${newName}"` : newName; // CMD ren needs new name unquoted if no spaces
            scriptLines.push(`echo Renaming ${originalName} to ${newName}...`);
            scriptLines.push(`if exist ${normOriginalPath} ( ren ${normOriginalPath} ${newNameForCmd} ) else ( echo File not found: ${normOriginalPath} )`);
        } else { // posix
            if (scriptLines.length === 0) scriptLines.push(`#!/bin/bash`, `# Shell script to rename files\n`);
            const dirPath = originalPath.substring(0, originalPath.lastIndexOf('/') + 1);
            const newFullPath = normalizePathForScript(`${dirPath}${newName}`, platform);
            scriptLines.push(`echo "Renaming ${originalName} to ${newName}..."`);
            scriptLines.push(`mv -f ${normOriginalPath} ${newFullPath} # Original: ${originalName}`);
        }
    });
    return scriptLines.join('\n');
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
        // This gives a handle, not a direct path string for security reasons.
        // For display, we can use directoryHandle.name.
        // The actual path for scripting might need manual input or different handling.
        setTargetDirectory(directoryHandle.name + " (Selected via Picker - Verify Path for Script)");
      } else {
        alert("Directory picker API not supported by your browser. Please type the path manually.");
      }
    } catch (error) {
      if (error.name !== 'AbortError') { // User cancelled picker
        console.error("Error selecting directory:", error);
        alert("Could not select directory. Please enter the path manually.");
      }
    }
  };

  const copyCommandsToClipboard = () => {
    if (!generatedCommands) return;
    navigator.clipboard.writeText(generatedCommands).then(() => {
      setCopied(true);
      onLogCommands(generatedCommands, platform);
    }).catch(err => {
      console.error("Failed to copy commands:", err);
      alert("Failed to copy commands to clipboard. See console for details.");
    });
  };

  useEffect(() => {
    updateGeneratedCommands();
  }, [updateGeneratedCommands]);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  if (!showDialog) return null;

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
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Operation Type:</label>
            <div className="flex space-x-3 flex-wrap gap-y-2">
              {[{value:'move', label:'Move'}, {value:'copy', label:'Copy'}, {value:'delete', label:'Delete'}, {value:'rename', label:'Rename'}].map(op => (
                <label key={op.value} className="inline-flex items-center cursor-pointer">
                  <input
                    type="radio" value={op.value} checked={operationType === op.value}
                    onChange={() => setOperationType(op.value)}
                    className="form-radio h-4 w-4 text-blue-600 dark:text-blue-500 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 focus:ring-blue-500 dark:focus:ring-blue-600"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-slate-300">{op.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Target Platform:</label>
            <div className="flex space-x-3 flex-wrap gap-y-2">
              {[ {value: 'windows_ps', label: 'PowerShell'}, {value: 'windows_cmd', label: 'Windows CMD'}, {value: 'posix', label: 'Unix/Linux/Mac'} ].map(plat =>(
                <label key={plat.value} className="inline-flex items-center cursor-pointer">
                   <input
                    type="radio" value={plat.value} checked={platform === plat.value}
                    onChange={() => setPlatform(plat.value)}
                    className="form-radio h-4 w-4 text-blue-600 dark:text-blue-500 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 focus:ring-blue-500 dark:focus:ring-blue-600"
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
                  className="flex-1 p-2 border border-gray-300 rounded-l-md dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:placeholder-slate-400 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleDirectorySelect}
                  className="p-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
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
                <button
                  onClick={updateGeneratedCommands}
                  className="p-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 flex items-center"
                  title="Refresh commands"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  onClick={copyCommandsToClipboard}
                  disabled={!generatedCommands}
                  className={`px-3 py-1.5 rounded flex items-center text-sm
                    ${copied
                      ? 'bg-green-600 text-white dark:bg-green-500'
                      : generatedCommands
                        ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-400'
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
              className="w-full h-40 sm:h-56 p-3 border border-gray-300 rounded-md font-mono text-xs bg-gray-50 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500 resize-y"
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
                    <li key={item.id || index} className="flex items-center py-0.5 border-b border-gray-200 dark:border-slate-600 last:border-0">
                      <ArrowRight size={12} className="text-gray-400 dark:text-slate-500 mr-2 flex-shrink-0" />
                      <span className="truncate text-gray-700 dark:text-slate-300" title={item.userPath || item.name}>
                        {item.userPath || item.name}
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