namespace Pulse.Server.Models;

public class Room
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Temp stop-gap for Phase 3 priority-speaker admin gating.
    // When server creation is implemented, admin lives at the server level — remove this field then.
    public Guid? CreatedByUserId { get; set; }
}
