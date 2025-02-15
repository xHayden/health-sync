export function ResponseStatus(success: boolean, route: string, responseCode?: number, message?: string) {
    return Response.json({
        success: success,
        route: route,
        responseCode: responseCode ?? 200,
        message: message ?? ""
    })
}