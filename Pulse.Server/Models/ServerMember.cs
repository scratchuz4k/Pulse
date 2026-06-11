namespace Pulse.Server.Models;

public class ServerMember
{
    public int Id { get; set; }
    public int ServerId { get; set; }
    public Guid UserId { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}
