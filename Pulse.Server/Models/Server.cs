namespace Pulse.Server.Models;

public class Server
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public Guid OwnerId { get; set; }
    public string InviteCode { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
