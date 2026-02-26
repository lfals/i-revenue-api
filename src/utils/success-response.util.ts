export const buildSuccessResponse = <T>(
  status: number,
  message: string,
  data?: T,
) => ({
  success: true,
  status,
  message,
  data: data ?? null,
})
