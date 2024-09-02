repeat wait() until game:IsLoaded()
local LogService = game:GetService("LogService")
local HttpService = game:GetService("HttpService")
local request = clonefunction(request or http.request or http_request or httprequest or httpRequest or fluxus.request)
local host = getgenv().EthernetIPv4 or game.Players.LocalPlayer.PlayerGui:FindFirstChild('TouchGui') and "10.0.2.2" or "localhost"

LogService.MessageOut:Connect(function(message, messageType)
    local logType =
        messageType == Enum.MessageType.MessageOutput  and "white" or
        messageType == Enum.MessageType.MessageWarning and "yellow" or
        messageType == Enum.MessageType.MessageError   and "red"
    request({
        Url = "http://" .. host .. ":8080",
        Method = 'POST',
        Headers = {["Content-Type"] = "application/json; charset=utf8"},
        Body = HttpService:JSONEncode({
            message = message,
            type = logType
        }),
    })
end)