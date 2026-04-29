import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, Check } from 'lucide-react'
import scriptCode from '../../Files/google-apps-script.js?raw'

export default function SetupScreen({ onSave, initialUrl }) {
  const [url, setUrl] = useState(initialUrl || '')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(scriptCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md glass-card rounded-2xl p-6">
        <h1 className="text-xl font-bold text-foreground mb-1">
          Control Gastos
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Conecta tu spreadsheet de Google para empezar.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              URL del Apps Script
            </label>
            <Input
              type="url"
              placeholder="https://script.google.com/macros/s/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <Button onClick={() => onSave(url)} className="w-full" disabled={!url}>
            Conectar
          </Button>
        </div>

        <div className="mt-6 text-xs text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">Instrucciones:</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Abre tu spreadsheet en Google Sheets</li>
            <li>
              Ve a <strong>Extensiones → Apps Script</strong>
            </li>
            <li>
              Pega el código del script (cópialo con el botón de abajo)
            </li>
            <li>
              Haz clic en <strong>Implementar → Nueva implementación</strong>
            </li>
            <li>
              Tipo: <strong>Aplicación web</strong>
            </li>
            <li>
              Ejecutar como: <strong>Tu cuenta</strong>
            </li>
            <li>
              Acceso: <strong>Cualquier persona</strong>
            </li>
            <li>Copia la URL y pégala aquí arriba</li>
          </ol>

          <Button
            variant="outline"
            className="w-full mt-3"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Código copiado
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copiar código Apps Script
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
