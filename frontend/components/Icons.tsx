import { Upload, Sparkles, Loader2 } from 'lucide-react';

export const UploadIcon = ({ className }: { className?: string }) => (
    <Upload className={className} />
)

export const SparklesIcon = ({ className }: { className?: string }) => (
    <Sparkles className={className} />
)

export const SpinnerIcon = ({ className }: { className?: string }) => (
    <Loader2 className={'animate-spin ${className}'} />
)