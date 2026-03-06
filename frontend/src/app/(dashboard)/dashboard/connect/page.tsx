'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/button';
import { Upload, Zap, Code, CheckCircle, FileUp } from 'lucide-react';
import LeadCaptureForm from '@/components/marketing/LeadCaptureForm';

function SuccessMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
      <CheckCircle className="size-5 text-emerald-500 shrink-0" />
      <div>
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{message}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Our team will activate your pipeline within 24 hours.</p>
      </div>
    </div>
  );
}

function UploadTab() {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleFile(file: File) {
    setFileName(file.name);
    setSuccess(true);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload a CSV or Parquet file with your telemetry data. We&apos;ll auto-detect schema and configure your pipeline.
      </p>

      {success ? (
        <SuccessMessage message={`${fileName} uploaded successfully.`} />
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            dragOver ? 'border-[#F5C518] bg-[#F5C518]/5' : 'border-border hover:border-[#F5C518]/50'
          }`}
        >
          <FileUp className="size-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">Drag & drop your file here</p>
          <p className="text-xs text-muted-foreground mb-4">CSV, Parquet, or JSON up to 100MB</p>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv,.parquet,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <span className="inline-flex text-sm font-medium px-6 py-2 rounded-full bg-[#F5C518] text-[#0A0A0A] hover:bg-[#FFD84D] transition-colors">
              Browse Files
            </span>
          </label>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        <p className="font-medium mb-1">Expected columns:</p>
        <code className="text-xs bg-muted px-2 py-1 rounded">
          timestamp, pipeline_id, vibration_mms, discharge_temp_f, suction_pressure_psi, discharge_pressure_psi
        </code>
      </div>
    </div>
  );
}

function EventHubsTab() {
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(true);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Connect directly to Azure Event Hubs for real-time streaming telemetry.
      </p>

      {success ? (
        <SuccessMessage message="Event Hub connection configured." />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Connection String</label>
            <input
              type="password"
              required
              placeholder="Endpoint=sb://...;SharedAccessKeyName=...;SharedAccessKey=..."
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#F5C518]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Event Hub Name</label>
              <input
                type="text"
                required
                placeholder="pipeline-telemetry"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C518]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Consumer Group</label>
              <input
                type="text"
                defaultValue="$Default"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C518]"
              />
            </div>
          </div>
          <Button
            type="submit"
            className="bg-[#F5C518] hover:bg-[#FFD84D] text-[#0A0A0A] font-semibold rounded-full px-8"
          >
            Connect
          </Button>
        </form>
      )}
    </div>
  );
}

function ApiTab() {
  const [apiKey] = useState(() => `avz_demo_${Math.random().toString(36).slice(2, 14)}`);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Push telemetry data via our REST API. Use the key below to authenticate your requests.
      </p>

      <div>
        <label className="text-sm font-medium text-foreground">Your API Key</label>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={apiKey}
            className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm font-mono focus:outline-none"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigator.clipboard.writeText(apiKey)}
          >
            Copy
          </Button>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Example Request</p>
        <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto">
{`curl -X POST https://api.altaviz.com/v1/telemetry \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "pipeline_id": "PIPE-001",
    "timestamp": "2026-03-06T12:00:00Z",
    "vibration_mms": 3.2,
    "discharge_temp_f": 195,
    "suction_pressure_psi": 62,
    "discharge_pressure_psi": 1050
  }'`}
        </pre>
      </div>

      <div className="text-xs text-muted-foreground">
        Full API documentation will be shared once your account is activated.
      </div>
    </div>
  );
}

export default function ConnectDataPage() {
  const [leadOpen, setLeadOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Header title="Connect Data" subtitle="Link your telemetry to start monitoring" />

      <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Choose Your Integration Method</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="upload">
              <TabsList variant="line" className="mb-6">
                <TabsTrigger value="upload" className="gap-2">
                  <Upload className="size-4" />
                  File Upload
                </TabsTrigger>
                <TabsTrigger value="eventhubs" className="gap-2">
                  <Zap className="size-4" />
                  Event Hubs
                </TabsTrigger>
                <TabsTrigger value="api" className="gap-2">
                  <Code className="size-4" />
                  REST API
                </TabsTrigger>
              </TabsList>
              <TabsContent value="upload">
                <UploadTab />
              </TabsContent>
              <TabsContent value="eventhubs">
                <EventHubsTab />
              </TabsContent>
              <TabsContent value="api">
                <ApiTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="bg-[#1A3A5C]/5 border-[#1A3A5C]/20">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#1A3A5C] flex items-center justify-center shrink-0">
                <Zap className="size-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-1">Need help setting up?</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Our team can help you configure your data pipeline in under an hour.
                </p>
                <Button
                  onClick={() => setLeadOpen(true)}
                  variant="outline"
                  className="rounded-full"
                >
                  Request Setup Help
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <LeadCaptureForm open={leadOpen} onClose={() => setLeadOpen(false)} />
    </div>
  );
}
