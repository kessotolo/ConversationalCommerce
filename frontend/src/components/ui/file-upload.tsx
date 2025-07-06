import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Upload, X, File, Image, AlertCircle, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"

const fileUploadVariants = cva(
    "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors",
    {
        variants: {
            variant: {
                default: "border-muted-foreground/25 hover:border-muted-foreground/50",
                active: "border-primary bg-primary/5",
                error: "border-destructive bg-destructive/5",
                success: "border-green-500 bg-green-50",
            },
            size: {
                default: "min-h-[200px] p-6",
                sm: "min-h-[120px] p-4",
                lg: "min-h-[300px] p-8",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface FileUploadProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof fileUploadVariants> {
    onFileSelect: (files: File[]) => void
    accept?: string
    multiple?: boolean
    maxSize?: number // in bytes
    maxFiles?: number
    disabled?: boolean
    value?: File[]
    showPreview?: boolean
    uploadProgress?: Record<string, number>
    errors?: string[]
}

const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
    ({
        className,
        variant,
        size,
        onFileSelect,
        accept,
        multiple = false,
        maxSize = 10 * 1024 * 1024, // 10MB default
        maxFiles = multiple ? 5 : 1,
        disabled = false,
        value = [],
        showPreview = true,
        uploadProgress = {},
        errors = [],
        children,
        ...props
    }, ref) => {
        const [dragActive, setDragActive] = React.useState(false)
        const [localErrors, setLocalErrors] = React.useState<string[]>([])
        const inputRef = React.useRef<HTMLInputElement>(null)

        const allErrors = [...errors, ...localErrors]
        const hasErrors = allErrors.length > 0

        const validateFile = (file: File): string | null => {
            if (maxSize && file.size > maxSize) {
                return `File "${file.name}" is too large. Maximum size is ${formatFileSize(maxSize)}.`
            }
            if (accept) {
                const acceptedTypes = accept.split(',').map(type => type.trim())
                const fileType = file.type
                const fileName = file.name.toLowerCase()

                const isAccepted = acceptedTypes.some(type => {
                    if (type.startsWith('.')) {
                        return fileName.endsWith(type.toLowerCase())
                    }
                    if (type.includes('*')) {
                        const baseType = type.split('/')[0]
                        return fileType.startsWith(baseType + '/')
                    }
                    return fileType === type
                })

                if (!isAccepted) {
                    return `File "${file.name}" is not an accepted file type.`
                }
            }
            return null
        }

        const handleFiles = (newFiles: FileList | File[]) => {
            const filesArray = Array.from(newFiles)
            const validationErrors: string[] = []

            // Check file count
            if (!multiple && filesArray.length > 1) {
                validationErrors.push("Only one file is allowed.")
                setLocalErrors(validationErrors)
                return
            }

            if (value.length + filesArray.length > maxFiles) {
                validationErrors.push(`Maximum ${maxFiles} files allowed.`)
                setLocalErrors(validationErrors)
                return
            }

            // Validate each file
            const validFiles: File[] = []
            filesArray.forEach(file => {
                const error = validateFile(file)
                if (error) {
                    validationErrors.push(error)
                } else {
                    validFiles.push(file)
                }
            })

            setLocalErrors(validationErrors)

            if (validFiles.length > 0) {
                if (multiple) {
                    onFileSelect([...value, ...validFiles])
                } else {
                    onFileSelect(validFiles)
                }
            }
        }

        const handleDrag = React.useCallback((e: React.DragEvent) => {
            e.preventDefault()
            e.stopPropagation()
            if (e.type === "dragenter" || e.type === "dragover") {
                setDragActive(true)
            } else if (e.type === "dragleave") {
                setDragActive(false)
            }
        }, [])

        const handleDrop = React.useCallback((e: React.DragEvent) => {
            e.preventDefault()
            e.stopPropagation()
            setDragActive(false)

            if (disabled) return

            const files = e.dataTransfer.files
            if (files && files.length > 0) {
                handleFiles(files)
            }
        }, [disabled, handleFiles])

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files.length > 0) {
                handleFiles(e.target.files)
            }
        }

        const removeFile = (index: number) => {
            const newFiles = value.filter((_, i) => i !== index)
            onFileSelect(newFiles)
        }

        const openFileDialog = () => {
            if (!disabled && inputRef.current) {
                inputRef.current.click()
            }
        }

        const getFileIcon = (file: File) => {
            if (file.type.startsWith('image/')) {
                return <Image className="h-8 w-8 text-blue-500" />
            }
            return <File className="h-8 w-8 text-gray-500" />
        }

        const currentVariant = hasErrors ? "error" : dragActive ? "active" : variant

        return (
            <div className="space-y-4">
                <div
                    ref={ref}
                    className={cn(fileUploadVariants({ variant: currentVariant, size }), className)}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    {...props}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept={accept}
                        multiple={multiple}
                        onChange={handleInputChange}
                        disabled={disabled}
                        className="hidden"
                    />

                    {children || (
                        <div className="text-center">
                            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <div className="space-y-2">
                                <p className="text-sm font-medium">
                                    {dragActive ? "Drop files here" : "Drag & drop files here"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    or{" "}
                                    <Button
                                        type="button"
                                        variant="link"
                                        className="h-auto p-0 text-xs"
                                        onClick={openFileDialog}
                                        disabled={disabled}
                                    >
                                        browse files
                                    </Button>
                                </p>
                                <div className="text-xs text-muted-foreground space-y-1">
                                    {accept && <p>Accepted: {accept}</p>}
                                    <p>Max size: {formatFileSize(maxSize)}</p>
                                    {multiple && <p>Max files: {maxFiles}</p>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Error Messages */}
                {allErrors.length > 0 && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            <ul className="list-disc list-inside space-y-1">
                                {allErrors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}

                {/* File Preview */}
                {showPreview && value.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">Selected Files</h4>
                        <div className="space-y-2">
                            {value.map((file, index) => (
                                <FilePreview
                                    key={`${file.name}-${index}`}
                                    file={file}
                                    onRemove={() => removeFile(index)}
                                    progress={uploadProgress[file.name]}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )
    }
)

FileUpload.displayName = "FileUpload"

// File Preview Component
interface FilePreviewProps {
    file: File
    onRemove: () => void
    progress?: number
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, onRemove, progress }) => {
    const [preview, setPreview] = React.useState<string | null>(null)

    React.useEffect(() => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader()
            reader.onload = (e) => setPreview(e.target?.result as string)
            reader.readAsDataURL(file)
        }
        return () => setPreview(null)
    }, [file])

    const isComplete = progress === 100
    const isUploading = progress !== undefined && progress < 100

    return (
        <div className="flex items-center space-x-3 p-3 border rounded-lg bg-muted/30">
            {preview ? (
                <img
                    src={preview}
                    alt={file.name}
                    className="h-10 w-10 rounded object-cover"
                />
            ) : (
                <File className="h-10 w-10 text-muted-foreground" />
            )}

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>

                {progress !== undefined && (
                    <div className="mt-1">
                        <Progress value={progress} className="h-1" />
                    </div>
                )}
            </div>

            <div className="flex items-center space-x-1">
                {isComplete && <Check className="h-4 w-4 text-green-500" />}
                {isUploading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                )}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={onRemove}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}

// Utility function to format file size
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export { FileUpload, FilePreview, fileUploadVariants }