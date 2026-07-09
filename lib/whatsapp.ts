import { prisma } from "./db"

/**
 * Formats Indonesian phone number to international standard (62...)
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, "")

  // Convert leading 0 to 62
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1)
  }

  // If it doesn't start with 62 but is valid, prepend 62
  if (cleaned.length >= 9 && !cleaned.startsWith("62")) {
    cleaned = "62" + cleaned
  }

  return cleaned
}

/**
 * Sends a WhatsApp message via Fonnte API (if FONNTE_TOKEN is configured)
 * or simulates it by logging to the console and database.
 */
export async function sendWhatsAppMessage(
  nomorNota: string,
  phone: string,
  message: string
): Promise<{ success: boolean; status: string; info?: string }> {
  const formattedPhone = formatPhoneNumber(phone)
  const fonnteToken = process.env.FONNTE_TOKEN

  console.log(`[WhatsApp Helper] Preparing to send message to ${phone} (${formattedPhone}) for invoice ${nomorNota}`)
  console.log(`[WhatsApp Helper] Message Content:\n---\n${message}\n---`)

  if (fonnteToken) {
    try {
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: fonnteToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: formattedPhone,
          message: message,
        }),
      })

      const result = await response.json()
      console.log("[WhatsApp Helper] Fonnte Response:", result)

      const success = result.status === true
      const statusText = success ? "SUCCESS" : "FAILED"

      await prisma.whatsappLog.create({
        data: {
          nomorNota,
          noHp: formattedPhone,
          pesan: message,
          status: statusText,
        },
      })

      return {
        success,
        status: statusText,
        info: result.detail || result.reason || "Fonnte API Response",
      }
    } catch (error) {
      console.error("[WhatsApp Helper] Error calling Fonnte API:", error)

      await prisma.whatsappLog.create({
        data: {
          nomorNota,
          noHp: formattedPhone,
          pesan: message,
          status: "FAILED",
        },
      })

      return {
        success: false,
        status: "FAILED",
        info: error instanceof Error ? error.message : "Network error",
      }
    }
  } else {
    // Simulated sending
    console.log(`[WhatsApp Helper] [SIMULASI] No FONNTE_TOKEN found in environment. Logging to database.`)

    await prisma.whatsappLog.create({
      data: {
        nomorNota,
        noHp: formattedPhone,
        pesan: message,
        status: "SIMULATED",
      },
    })

    return {
      success: true,
      status: "SIMULATED",
      info: "Simulated sending (No API token configured)",
    }
  }
}
