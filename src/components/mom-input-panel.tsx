"use client";

import { CircleAlert, Eraser, FilePenLine, Sparkles, Square } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MIN_MOM_LENGTH } from "@/types/prd";

interface MomInputPanelProps {
  value: string;
  onValueChange: (value: string) => void;
  onGenerate: () => void;
  onStop: () => void;
  onClear: () => void;
  isLoading: boolean;
  error?: string;
}

export function MomInputPanel({
  value,
  onValueChange,
  onGenerate,
  onStop,
  onClear,
  isLoading,
  error,
}: MomInputPanelProps) {
  const isValid = value.trim().length >= MIN_MOM_LENGTH;

  return (
    <Card className="min-h-[32rem] min-w-0 lg:min-h-0">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <FilePenLine className="size-4 text-muted-foreground" />
          Catatan Rapat (MoM)
        </CardTitle>
        <CardDescription>
          Tempel catatan rapat mentah. Sistem akan menyusunnya menjadi PRD.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 pt-4">
        <Textarea
          aria-label="Catatan rapat (MoM)"
          className="min-h-64 flex-1 resize-none lg:min-h-0"
          placeholder={`Contoh:\nRapat produk 12 November 2026 — hadir: Product, Design, Engineering.\nMasalah: pengguna sulit menemukan riwayat transaksi...\nKeputusan: menambahkan halaman riwayat dengan filter tanggal...`}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          disabled={isLoading}
        />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {value.trim().length} karakter
            {!isValid ? ` · minimal ${MIN_MOM_LENGTH}` : ""}
          </span>
          <span>Bahasa Indonesia</span>
        </div>

        {error ? (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>

      <CardFooter className="flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClear}
          disabled={isLoading || value.length === 0}
        >
          <Eraser />
          Kosongkan
        </Button>
        <div className="ml-auto flex gap-2">
          {isLoading ? (
            <Button type="button" variant="destructive" onClick={onStop}>
              <Square />
              Hentikan
            </Button>
          ) : null}
          <Button
            type="button"
            onClick={onGenerate}
            disabled={!isValid || isLoading}
          >
            <Sparkles />
            Buat PRD
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
