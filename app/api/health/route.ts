export async function GET() {
  try {
    // Check if the application is running
    return Response.json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV 
    })
  } catch (error) {
    return Response.json({ 
      status: 'error',
      message: 'Health check failed' 
    }, { status: 500 })
  }
}
