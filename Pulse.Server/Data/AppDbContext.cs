using Microsoft.EntityFrameworkCore;
using Pulse.Server.Models;

namespace Pulse.Server.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    // Dev: delete pulse.db and restart to apply schema — EnsureCreated does not migrate existing DBs.
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<Models.Server> Servers => Set<Models.Server>();
    public DbSet<Models.ServerMember> ServerMembers => Set<Models.ServerMember>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<Room>()
            .HasIndex(r => new { r.ServerId, r.Name })
            .IsUnique();
        modelBuilder.Entity<Room>()
            .HasOne<Models.Server>()
            .WithMany()
            .HasForeignKey(r => r.ServerId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ServerMember>()
            .HasIndex(m => new { m.ServerId, m.UserId })
            .IsUnique();
    }
}
