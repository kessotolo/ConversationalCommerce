export const useToast = () => {
    const toast = (options: { title: string; description?: string; variant?: 'default' | 'destructive' }) => {
        // Simple console log for now - can be replaced with actual toast implementation
        console.log('Toast:', options)
    }

    return { toast }
}